import Foundation

public struct Kit: Equatable, Hashable, Identifiable, Sendable {
    public var id: KitId
    public var name: String
    public var itemIds: [ItemId]
    public init(id: KitId, name: String, itemIds: [ItemId] = []) {
        self.id = id; self.name = name; self.itemIds = itemIds
    }
}

public func createKit(_ kits: [Kit], id: KitId, name: String) throws -> [Kit] {
    try invariant(!name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, "Kit name must not be empty")
    try invariant(!kits.contains { $0.id == id }, "Kit with id \"\(id)\" already exists")
    return kits + [Kit(id: id, name: name)]
}

public func renameKit(_ kits: [Kit], id: KitId, name: String) throws -> [Kit] {
    try invariant(!name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, "Kit name must not be empty")
    try invariant(kits.contains { $0.id == id }, "Kit with id \"\(id)\" not found")
    return kits.map { var k = $0; if k.id == id { k.name = name }; return k }
}

public func addItemToKit(_ kits: [Kit], id: KitId, itemId: ItemId) throws -> [Kit] {
    try invariant(kits.contains { $0.id == id }, "Kit with id \"\(id)\" not found")
    return kits.map { var k = $0; if k.id == id { k.itemIds = dedupe(k.itemIds + [itemId]) }; return k }
}

public func removeItemFromKit(_ kits: [Kit], id: KitId, itemId: ItemId) throws -> [Kit] {
    try invariant(kits.contains { $0.id == id }, "Kit with id \"\(id)\" not found")
    return kits.map { var k = $0; if k.id == id { k.itemIds.removeAll { $0 == itemId } }; return k }
}

/// Moves an item to `toIndex` within the kit; the index is clamped.
public func moveItemInKit(_ kits: [Kit], id: KitId, itemId: ItemId, toIndex: Int) throws -> [Kit] {
    let kit = try findKit(kits, id: id)
    try invariant(kit.itemIds.contains(itemId), "Item \"\(itemId)\" is not in kit \"\(id)\"")
    let rest = kit.itemIds.filter { $0 != itemId }
    let index = max(0, min(rest.count, toIndex))
    let itemIds = Array(rest[..<index]) + [itemId] + Array(rest[index...])
    return kits.map { var k = $0; if k.id == id { k.itemIds = itemIds }; return k }
}

public func deleteKit(_ kits: [Kit], id: KitId) throws -> [Kit] {
    try invariant(kits.contains { $0.id == id }, "Kit with id \"\(id)\" not found")
    return kits.filter { $0.id != id }
}

public func findKit(_ kits: [Kit], id: KitId) throws -> Kit {
    guard let kit = kits.first(where: { $0.id == id }) else {
        throw InvariantViolation("Kit with id \"\(id)\" not found")
    }
    return kit
}
