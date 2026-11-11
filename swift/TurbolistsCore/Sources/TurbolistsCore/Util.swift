public struct InvariantViolation: Error, Equatable, CustomStringConvertible, Sendable {
    public let message: String
    public init(_ message: String) { self.message = message }
    public var description: String { "Invariant violation: \(message)" }
}

public func invariant(_ condition: Bool, _ message: @autoclosure () -> String) throws {
    if !condition { throw InvariantViolation(message()) }
}

/// Returns a new array with duplicates removed, preserving first occurrence order.
public func dedupe<T: Hashable>(_ ids: [T]) -> [T] {
    var seen = Set<T>()
    var result: [T] = []
    for id in ids where seen.insert(id).inserted { result.append(id) }
    return result
}
