import Combine
import Foundation
import ObservableStore
import Testing
import TurbolistsCore
@testable import Turbolists

private func tempURL() -> URL {
    FileManager.default.temporaryDirectory
        .appendingPathComponent("turbolists-\(UUID().uuidString)", isDirectory: true)
        .appendingPathComponent("store.json")
}

@Suite struct PersistenceTests {
    @Test func missingFileReadsEmpty() throws {
        #expect(try PersistenceService(url: tempURL()).read() == Library())
    }

    @Test func roundTrip() throws {
        let service = PersistenceService(url: tempURL())
        let library = Library(
            items: [Item(id: "i1", name: "Headlamp", notes: "AAA")],
            kits: [Kit(id: "k1", name: "Camp", itemIds: ["i1"])],
            trips: [Trip(id: "t1", name: "Coast", createdAt: "2026-11-10", kitIds: ["k1"], archived: true, checked: ["i1"])]
        )
        try service.write(library)
        #expect(try service.read() == library)
        try service.write(Library())
        #expect(try service.read() == Library())
        #expect(!FileManager.default.fileExists(atPath: service.url.appendingPathExtension("tmp").path))
    }

    @Test func corruptFileThrows() throws {
        let url = tempURL()
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try "not json".write(to: url, atomically: true, encoding: .utf8)
        #expect(throws: (any Error).self) { try PersistenceService(url: url).read() }
    }

    /// Regression: auto-save and the background flush used to hop through a concurrent
    /// queue before the serial one, so an older snapshot could be written last.
    @Test func queuedWritesLandInCallOrder() async throws {
        let service = PersistenceService(url: tempURL())
        let recorder = OrderRecorder()
        let count = 40
        await withCheckedContinuation { (done: CheckedContinuation<Void, Never>) in
            for i in 0..<count {
                let library = Library(items: (0...i).map { Item(id: ItemId("i\($0)"), name: "Item \($0)") })
                service.enqueueWrite(library) { result in
                    if case .success = result { recorder.append(i) }
                    if i == count - 1 { done.resume() }
                }
            }
        }
        #expect(recorder.values == Array(0..<count))
        #expect(try service.read().items.count == count)
    }

    @Test func idsAreUniqueSortableUlids() {
        let a = newItemId().rawValue, b = newItemId().rawValue
        #expect(a.count == 26 && a != b)
    }

    @MainActor
    @Test func startLoadsThenDebouncedAutoSave() async throws {
        let url = tempURL()
        let service = PersistenceService(url: url)
        try service.write(Library(items: [Item(id: "a", name: "Existing")]))

        let store = Store(state: AppModel(), environment: AppEnvironment(persistence: service, saveDelay: 0.1))
        store.send(.start)
        try await waitUntil { store.state.loadStatus == .ready }
        #expect(store.state.data.items.map(\.name) == ["Existing"])

        // Rapid burst of edits collapses into one write of the final state.
        store.send(.createItem(id: "b", name: "One"))
        store.send(.createItem(id: "c", name: "Two"))
        store.send(.createItem(id: "d", name: "Three"))
        // Not yet written (debounce pending).
        #expect(try service.read().items.count == 1)
        try await waitUntil { (try? service.read().items.count) == 4 }
        try await waitUntil { store.state.persistence == .saved }
    }

    @MainActor
    @Test func doesNotSaveBeforeLoaded() async throws {
        let url = tempURL()
        let store = Store(state: AppModel(), environment: AppEnvironment(persistence: PersistenceService(url: url), saveDelay: 0.05))
        store.send(.retrySave)
        store.send(.flushSave)
        try await Task.sleep(for: .milliseconds(300))
        #expect(!FileManager.default.fileExists(atPath: url.path))
    }
}

@MainActor
private func waitUntil(timeout: Double = 5, _ condition: () -> Bool) async throws {
    let deadline = Date().addingTimeInterval(timeout)
    while !condition() {
        if Date() > deadline { Issue.record("timed out waiting for condition"); return }
        try await Task.sleep(for: .milliseconds(20))
    }
}

private final class OrderRecorder: @unchecked Sendable {
    private let lock = NSLock()
    private var stored: [Int] = []
    func append(_ value: Int) { lock.withLock { stored.append(value) } }
    var values: [Int] { lock.withLock { stored } }
}
