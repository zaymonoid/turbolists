import Foundation

public struct Item: Equatable, Hashable, Identifiable, Sendable {
    public var id: ItemId
    public var name: String
    public var notes: String?
    public init(id: ItemId, name: String, notes: String? = nil) {
        self.id = id; self.name = name; self.notes = notes
    }
}

public func createItem(_ items: [Item], id: ItemId, name: String, notes: String? = nil) throws -> [Item] {
    try invariant(!name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, "Item name must not be empty")
    try invariant(!items.contains { $0.id == id }, "Item with id \"\(id)\" already exists")
    return items + [Item(id: id, name: name, notes: notes)]
}

public func renameItem(_ items: [Item], id: ItemId, name: String) throws -> [Item] {
    try invariant(!name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, "Item name must not be empty")
    try invariant(items.contains { $0.id == id }, "Item with id \"\(id)\" not found")
    return items.map { var i = $0; if i.id == id { i.name = name }; return i }
}

public func deleteItem(_ items: [Item], id: ItemId) throws -> [Item] {
    try invariant(items.contains { $0.id == id }, "Item with id \"\(id)\" not found")
    return items.filter { $0.id != id }
}

public func findItem(_ items: [Item], id: ItemId) throws -> Item {
    guard let item = items.first(where: { $0.id == id }) else {
        throw InvariantViolation("Item with id \"\(id)\" not found")
    }
    return item
}
