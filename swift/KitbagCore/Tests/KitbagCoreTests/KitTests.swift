import Testing
@testable import KitbagCore

private let f1: KitId = "f1"
private let f2: KitId = "f2"
private let i1: ItemId = "i1"
private let i2: ItemId = "i2"
private let i3: ItemId = "i3"

@Test func createKitCreatesKitWithEmptyItemIds() throws {
    let kits = try createKit([], id: f1, name: "Trad Rack")
    #expect(kits.count == 1)
    #expect(kits[0].id == f1)
    #expect(kits[0].name == "Trad Rack")
    #expect(kits[0].itemIds == [])
}

@Test func createKitAppendsToExistingKits() throws {
    var kits: [Kit] = []
    kits = try createKit(kits, id: f1, name: "Trad Rack")
    kits = try createKit(kits, id: f2, name: "Camp Kitchen")
    #expect(kits.count == 2)
}

@Test func createKitThrowsOnEmptyName() {
    #expect(throws: InvariantViolation.self) { try createKit([], id: f1, name: "") }
}

@Test func createKitThrowsOnDuplicateId() throws {
    let kits = try createKit([], id: f1, name: "Trad Rack")
    #expect(throws: InvariantViolation.self) { try createKit(kits, id: f1, name: "Camp Kitchen") }
}

@Test func renameKitRenamesExistingKit() throws {
    let kits = try createKit([], id: f1, name: "Trad Rack")
    #expect(try renameKit(kits, id: f1, name: "Sport Rack")[0].name == "Sport Rack")
}

@Test func renameKitPreservesItemIds() throws {
    var kits = try createKit([], id: f1, name: "Trad Rack")
    kits = try addItemToKit(kits, id: f1, itemId: i1)
    #expect(try renameKit(kits, id: f1, name: "Sport Rack")[0].itemIds == [i1])
}

@Test func renameKitThrowsOnMissingKit() {
    #expect(throws: InvariantViolation.self) { try renameKit([], id: f1, name: "New Name") }
}

@Test func renameKitThrowsOnEmptyName() throws {
    let kits = try createKit([], id: f1, name: "Trad Rack")
    #expect(throws: InvariantViolation.self) { try renameKit(kits, id: f1, name: "") }
}

@Test func addItemToKitAddsItemToKit() throws {
    let kits = try createKit([], id: f1, name: "Trad Rack")
    #expect(try addItemToKit(kits, id: f1, itemId: i1)[0].itemIds == [i1])
}

@Test func addItemToKitAddsMultipleItemsPreservingOrder() throws {
    var kits = try createKit([], id: f1, name: "Trad Rack")
    kits = try addItemToKit(kits, id: f1, itemId: i2)
    kits = try addItemToKit(kits, id: f1, itemId: i1)
    #expect(kits[0].itemIds == [i2, i1])
}

@Test func addItemToKitIdempotent() throws {
    var kits = try createKit([], id: f1, name: "Trad Rack")
    kits = try addItemToKit(kits, id: f1, itemId: i1)
    kits = try addItemToKit(kits, id: f1, itemId: i1)
    #expect(kits[0].itemIds == [i1])
}

@Test func addItemToKitThrowsOnNonexistentKit() {
    #expect(throws: InvariantViolation.self) { try addItemToKit([], id: f1, itemId: i1) }
}

@Test func addItemToKitPreservesOtherKits() throws {
    var kits: [Kit] = []
    kits = try createKit(kits, id: f1, name: "Trad Rack")
    kits = try createKit(kits, id: f2, name: "Camp Kitchen")
    kits = try addItemToKit(kits, id: f1, itemId: i1)
    #expect(kits[1].itemIds == [])
}

@Test func removeItemFromKitRemovesItem() throws {
    var kits = try createKit([], id: f1, name: "Trad Rack")
    kits = try addItemToKit(kits, id: f1, itemId: i1)
    #expect(try removeItemFromKit(kits, id: f1, itemId: i1)[0].itemIds == [])
}

@Test func removeItemFromKitPreservesOtherItemsAndOrder() throws {
    var kits = try createKit([], id: f1, name: "Trad Rack")
    kits = try addItemToKit(kits, id: f1, itemId: i1)
    kits = try addItemToKit(kits, id: f1, itemId: i2)
    kits = try addItemToKit(kits, id: f1, itemId: i3)
    #expect(try removeItemFromKit(kits, id: f1, itemId: i2)[0].itemIds == [i1, i3])
}

@Test func removeItemFromKitThrowsOnNonexistentKit() {
    #expect(throws: InvariantViolation.self) { try removeItemFromKit([], id: f1, itemId: i1) }
}

@Test func removeItemFromKitNoOpForItemNotInKit() throws {
    let kits = try createKit([], id: f1, name: "Trad Rack")
    #expect(try removeItemFromKit(kits, id: f1, itemId: i1)[0].itemIds == [])
}

@Test func deleteKitRemovesKit() throws {
    #expect(try deleteKit(createKit([], id: f1, name: "Trad Rack"), id: f1).count == 0)
}

@Test func deleteKitPreservesOtherKits() throws {
    var kits: [Kit] = []
    kits = try createKit(kits, id: f1, name: "Trad Rack")
    kits = try createKit(kits, id: f2, name: "Camp Kitchen")
    let deleted = try deleteKit(kits, id: f1)
    #expect(deleted.count == 1)
    #expect(deleted[0].name == "Camp Kitchen")
}

@Test func deleteKitThrowsOnMissingKit() {
    #expect(throws: InvariantViolation.self) { try deleteKit([], id: f1) }
}

@Test func findKitFindsExistingKit() throws {
    #expect(try findKit(createKit([], id: f1, name: "Trad Rack"), id: f1).name == "Trad Rack")
}

@Test func findKitThrowsOnMissingKit() {
    #expect(throws: InvariantViolation.self) { try findKit([], id: f1) }
}

// Property-based tests

@Test func propertyAddThenRemoveItemIsIdentityOnItemIds() throws {
    try forAll { rng in
        var kits = try createKit([], id: f1, name: randomName(&rng))
        kits = try addItemToKit(kits, id: f1, itemId: i1)
        kits = try removeItemFromKit(kits, id: f1, itemId: i1)
        #expect(kits[0].itemIds == [])
    }
}

@Test func propertyAddingSameItemMultipleTimesIsIdempotent() throws {
    try forAll { rng in
        var kits = try createKit([], id: f1, name: "Test")
        for _ in 0..<Int.random(in: 1...10, using: &rng) {
            kits = try addItemToKit(kits, id: f1, itemId: i1)
        }
        #expect(kits[0].itemIds == [i1])
    }
}

@Test func propertyCreateNKitsThenDeleteAllYieldsEmpty() throws {
    try forAll { rng in
        let names = (0..<Int.random(in: 1...10, using: &rng)).map { _ in randomName(&rng) }
        var kits: [Kit] = []
        let ids = names.indices.map { KitId("f-\($0)") }
        for (i, n) in names.enumerated() { kits = try createKit(kits, id: ids[i], name: n) }
        for id in ids { kits = try deleteKit(kits, id: id) }
        #expect(kits.isEmpty)
    }
}

@Test func moveItemInKitMovesAnItemToTheTargetIndex() throws {
    let kits = [Kit(id: f1, name: "A", itemIds: [i1, i2, i3])]
    #expect(try moveItemInKit(kits, id: f1, itemId: i1, toIndex: 2)[0].itemIds == [i2, i3, i1])
    #expect(try moveItemInKit(kits, id: f1, itemId: i3, toIndex: 0)[0].itemIds == [i3, i1, i2])
    #expect(try moveItemInKit(kits, id: f1, itemId: i2, toIndex: 1)[0].itemIds == [i1, i2, i3])
}

@Test func moveItemInKitClampsTheIndexAndLeavesOtherKitsAlone() throws {
    let kits = [
        Kit(id: f1, name: "A", itemIds: [i1, i2, i3]),
        Kit(id: f2, name: "B", itemIds: [i1, i2]),
    ]
    let moved = try moveItemInKit(kits, id: f1, itemId: i1, toIndex: 99)
    #expect(moved[0].itemIds == [i2, i3, i1])
    #expect(moved[1] == kits[1])
    #expect(try moveItemInKit(kits, id: f1, itemId: i3, toIndex: -4)[0].itemIds == [i3, i1, i2])
}

@Test func moveItemInKitThrowsWhenTheItemIsNotInTheKit() {
    let kits = [Kit(id: f1, name: "A", itemIds: [i1])]
    do { _ = try moveItemInKit(kits, id: f1, itemId: i2, toIndex: 0); Issue.record("expected throw") }
    catch let e as InvariantViolation { #expect(e.message.contains("is not in kit")) }
    catch { Issue.record("wrong error \(error)") }
    do { _ = try moveItemInKit(kits, id: f2, itemId: i1, toIndex: 0); Issue.record("expected throw") }
    catch let e as InvariantViolation { #expect(e.message.contains("not found")) }
    catch { Issue.record("wrong error \(error)") }
}

@Test func moveItemInKitAlwaysYieldsAPermutationWithTheItemAtTheClampedIndex() throws {
    try forAll { rng in
        let ids = randomUniqueStrings(&rng, min: 1, max: 12, maxLen: 6).map { ItemId($0) }
        let moving = ids[Int.random(in: 0..<ids.count, using: &rng)]
        let toIndex = Int.random(in: -3...40, using: &rng)
        let result = try moveItemInKit([Kit(id: f1, name: "A", itemIds: ids)], id: f1, itemId: moving, toIndex: toIndex)[0].itemIds
        #expect(result.sorted() == ids.sorted())
        #expect(result.firstIndex(of: moving) == max(0, min(ids.count - 1, toIndex)))
        #expect(result.filter { $0 != moving } == ids.filter { $0 != moving })
    }
}
