import Testing
@testable import TurbolistsCore

private let i1: ItemId = "i1"
private let i2: ItemId = "i2"

@Test func createItemCreatesItemWithName() throws {
    let items = try createItem([], id: i1, name: "Headlamp")
    #expect(items.count == 1)
    #expect(items[0] == Item(id: i1, name: "Headlamp"))
}

@Test func createItemCreatesItemWithNotes() throws {
    let items = try createItem([], id: i1, name: "Headlamp", notes: "Black Diamond Spot")
    #expect(items[0] == Item(id: i1, name: "Headlamp", notes: "Black Diamond Spot"))
}

@Test func createItemAppendsToExistingItems() throws {
    var items: [Item] = []
    items = try createItem(items, id: i1, name: "Headlamp")
    items = try createItem(items, id: i2, name: "Harness")
    #expect(items.count == 2)
    #expect(items[0].name == "Headlamp")
    #expect(items[1].name == "Harness")
}

@Test func createItemThrowsOnEmptyName() {
    #expect(throws: InvariantViolation.self) { try createItem([], id: i1, name: "") }
}

@Test func createItemThrowsOnWhitespaceOnlyName() {
    #expect(throws: InvariantViolation.self) { try createItem([], id: i1, name: "   ") }
}

@Test func createItemThrowsOnDuplicateId() throws {
    let items = try createItem([], id: i1, name: "Headlamp")
    #expect(throws: InvariantViolation.self) { try createItem(items, id: i1, name: "Harness") }
}

@Test func renameItemRenamesExistingItem() throws {
    let items = try createItem([], id: i1, name: "Headlamp")
    #expect(try renameItem(items, id: i1, name: "LED Headlamp")[0].name == "LED Headlamp")
}

@Test func renameItemPreservesOtherItems() throws {
    var items: [Item] = []
    items = try createItem(items, id: i1, name: "Headlamp")
    items = try createItem(items, id: i2, name: "Harness")
    let renamed = try renameItem(items, id: i1, name: "LED Headlamp")
    #expect(renamed.count == 2)
    #expect(renamed[0].name == "LED Headlamp")
    #expect(renamed[1].name == "Harness")
}

@Test func renameItemPreservesNotes() throws {
    let items = try createItem([], id: i1, name: "Headlamp", notes: "my notes")
    #expect(try renameItem(items, id: i1, name: "LED Headlamp")[0].notes == "my notes")
}

@Test func renameItemThrowsOnMissingItem() {
    #expect(throws: InvariantViolation.self) { try renameItem([], id: i1, name: "Headlamp") }
}

@Test func renameItemThrowsOnEmptyName() throws {
    let items = try createItem([], id: i1, name: "Headlamp")
    #expect(throws: InvariantViolation.self) { try renameItem(items, id: i1, name: "") }
}

@Test func deleteItemRemovesItem() throws {
    let items = try createItem([], id: i1, name: "Headlamp")
    #expect(try deleteItem(items, id: i1).count == 0)
}

@Test func deleteItemPreservesOtherItems() throws {
    var items: [Item] = []
    items = try createItem(items, id: i1, name: "Headlamp")
    items = try createItem(items, id: i2, name: "Harness")
    let deleted = try deleteItem(items, id: i1)
    #expect(deleted.count == 1)
    #expect(deleted[0].name == "Harness")
}

@Test func deleteItemThrowsOnMissingItem() {
    #expect(throws: InvariantViolation.self) { try deleteItem([], id: i1) }
}

@Test func findItemFindsExistingItem() throws {
    let items = try createItem([], id: i1, name: "Headlamp")
    #expect(try findItem(items, id: i1).name == "Headlamp")
}

@Test func findItemThrowsOnMissingItem() {
    #expect(throws: InvariantViolation.self) { try findItem([], id: i1) }
}

@Test func propertyCreateNItemsThenDeleteInReverseYieldsEmpty() throws {
    try forAll { rng in
        let names = (0..<Int.random(in: 1...10, using: &rng)).map { _ in randomName(&rng) }
        var items: [Item] = []
        var ids: [ItemId] = []
        for (i, name) in names.enumerated() {
            let id = ItemId("item-\(i)")
            ids.append(id)
            items = try createItem(items, id: id, name: name)
        }
        for id in ids.reversed() { items = try deleteItem(items, id: id) }
        #expect(items.isEmpty)
    }
}

@Test func propertyRenamePreservesArrayLength() throws {
    try forAll { rng in
        let items = try createItem([], id: i1, name: randomName(&rng))
        #expect(try renameItem(items, id: i1, name: randomName(&rng)).count == items.count)
    }
}

@Test func propertyFindItemAlwaysFindsCreatedItems() throws {
    try forAll { rng in
        let name = randomName(&rng)
        let items = try createItem([], id: i1, name: name)
        #expect(try findItem(items, id: i1).name == name)
    }
}
