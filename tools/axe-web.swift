import Foundation
import FBControlCore
import FBSimulatorControl

final class QuietLogger: NSObject, FBControlCoreLogger {
    var name: String? { "turbolists-accessibility" }
    var level: FBControlCoreLogLevel { .error }
    func log(_ message: String) -> any FBControlCoreLogger { self }
    func info() -> any FBControlCoreLogger { self }
    func debug() -> any FBControlCoreLogger { self }
    func error() -> any FBControlCoreLogger { self }
    func withName(_ name: String) -> any FBControlCoreLogger { self }
    func withDateFormatEnabled(_ enabled: Bool) -> any FBControlCoreLogger { self }
}
final class EmptyReporter: NSObject, FBEventReporter {
    var metadata: [String: String] = [:]
    func report(_ subject: FBEventReporterSubject) {}
    func addMetadata(_ metadata: [String: String]) {}
}

@main struct WebSnapshot {
    static func flatten(_ value: Any) -> [[String: Any]] {
        if let array = value as? [Any] { return array.flatMap(flatten) }
        guard let node = value as? [String: Any] else { return [] }
        return [node] + flatten(node["children"] ?? [])
    }

    /// Accessibility exposes full DOM bounds, including clipped content. Ask
    /// WebKit to reveal the target, then return its updated bounds for HID input.
    @MainActor static func printVisibleTarget(_ point: CGPoint, target: FBSimulator) async throws {
        let element = try await target.accessibilityElement(at: point)
        defer { element.close() }
        try element.scroll(with: .visible)
        try await Task.sleep(for: .milliseconds(250))
        let response = try element.serialize(with: FBAccessibilityRequestOptions(nestedFormat: false))
        print(String(decoding: try JSONSerialization.data(withJSONObject: response.elements, options: [.sortedKeys]), as: UTF8.self))
    }

    @MainActor static func main() async throws {
        let logger = QuietLogger()
        try FBSimulatorControlFrameworkLoader.essentialFrameworks.loadPrivateFrameworks(logger)
        try FBSimulatorControlFrameworkLoader.xcodeFrameworks.loadPrivateFrameworks(logger)
        FBControlCoreGlobalConfiguration.defaultLogger = logger
        let configuration = FBSimulatorControlConfiguration(deviceSetPath: nil, logger: logger, reporter: EmptyReporter())
        let control = try FBSimulatorControl.withConfiguration(configuration)
        guard let target = control.set.allSimulators.first(where: { $0.udid == CommandLine.arguments[1] }) else {
            throw NSError(domain: "Turbolists", code: 1, userInfo: [NSLocalizedDescriptionKey: "Simulator not found"])
        }
        if CommandLine.arguments.count == 4,
           let x = Double(CommandLine.arguments[2]), let y = Double(CommandLine.arguments[3]) {
            try await printVisibleTarget(CGPoint(x: x, y: y), target: target)
            return
        }
        let root = try await target.accessibilityElementForFrontmostApplication()
        defer { root.close() }
        let response = try root.serialize(with: FBAccessibilityRequestOptions(
            nestedFormat: true,
            keys: FBAXKeys.defaultSet.union([.isRemote, .focused, .hidden, .placeholder, .traits]),
            remoteContentOptions: FBAccessibilityRemoteContentOptions(gridStepSize: 32)
        ))
        if CommandLine.arguments.count >= 4, CommandLine.arguments[2] == "label" {
            let label = CommandLine.arguments[3]
            let type = CommandLine.arguments.count > 4 ? CommandLine.arguments[4] : ""
            let matches = flatten(response.elements).filter { node in
                let actual = node["type"] as? String ?? ""
                let matchesType = type.isEmpty || actual == type ||
                    (type == "Button" && actual == "Link") ||
                    (type == "TextField" && ["SearchField", "ComboBox", "TextView", "TextArea", "SecureTextField"].contains(actual))
                return node["AXLabel"] as? String == label && matchesType
            }
            guard matches.count == 1,
                  let frame = matches[0]["frame"] as? [String: Double],
                  let x = frame["x"], let y = frame["y"], let width = frame["width"], let height = frame["height"] else {
                throw NSError(domain: "Turbolists", code: 2, userInfo: [NSLocalizedDescriptionKey: matches.count > 1 ? "Multiple accessibility elements matched" : "No accessibility element matched"])
            }
            try await printVisibleTarget(CGPoint(x: x + width / 2, y: y + height / 2), target: target)
            return
        }
        let data = try JSONSerialization.data(withJSONObject: response.elements, options: [.sortedKeys])
        print(String(decoding: data, as: UTF8.self))
    }
}
