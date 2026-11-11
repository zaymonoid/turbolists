import Foundation
import Testing
@testable import KitbagCore

private let i1: ItemId = "i1", i2: ItemId = "i2"
private let f1: KitId = "f1", f2: KitId = "f2"
private let t1: TripId = "t1"

private func makeTrip(_ id: TripId, _ name: String, _ createdAt: String, _ kitIds: [KitId], _ checked: [ItemId]) -> Trip {
    Trip(id: id, name: name, createdAt: createdAt, kitIds: kitIds, checked: Set(checked))
}

private func parse(_ json: String) throws -> [String: Any] {
    try JSONSerialization.jsonObject(with: Data(json.utf8)) as! [String: Any]
}

private func roundTrip(_ l: Library) throws -> Library { try loadLibrary(json: libraryToJson(l)) }

// Library()

@Test func emptyLibraryReturnsEmptyCollections() {
    let l = Library()
    #expect(l.items.count == 0)
    #expect(l.kits.count == 0)
    #expect(l.trips.count == 0)
}

// libraryToJson

@Test func libraryToJsonSerializesEmptyLibrary() throws {
    let p = try parse(libraryToJson(Library()))
    #expect((p["items"] as! [Any]).isEmpty)
    #expect((p["kits"] as! [Any]).isEmpty)
    #expect((p["trips"] as! [Any]).isEmpty)
    #expect(libraryToJson(Library()) == "{\n  \"items\": [],\n  \"kits\": [],\n  \"trips\": []\n}\n")
}

@Test func libraryToJsonEndsWithNewline() { #expect(libraryToJson(Library()).hasSuffix("\n")) }

@Test func libraryToJsonSerializesItemsWithNotes() throws {
    let l = Library(items: [Item(id: i1, name: "Headlamp", notes: "BD Spot")])
    let items = try parse(libraryToJson(l))["items"] as! [[String: Any]]
    #expect(items.count == 1)
    #expect(items[0]["id"] as? String == "i1")
    #expect(items[0]["name"] as? String == "Headlamp")
    #expect(items[0]["notes"] as? String == "BD Spot")
}

@Test func libraryToJsonOmitsNotesWhenNil() throws {
    let l = Library(items: [Item(id: i1, name: "Headlamp")])
    let items = try parse(libraryToJson(l))["items"] as! [[String: Any]]
    #expect(items[0]["notes"] == nil)
}

@Test func libraryToJsonPreservesKitItemIdsOrder() throws {
    let l = Library(kits: [Kit(id: f1, name: "Trad", itemIds: ["i3", i1, i2])])
    let kits = try parse(libraryToJson(l))["kits"] as! [[String: Any]]
    #expect(kits[0]["itemIds"] as? [String] == ["i3", "i1", "i2"])
}

@Test func libraryToJsonSerializesTripCheckedAsSortedArray() throws {
    let l = Library(trips: [makeTrip(t1, "Test", "2025-01-01", [f2, f1], ["i3", i1])])
    let t = (try parse(libraryToJson(l))["trips"] as! [[String: Any]])[0]
    #expect(t["kitIds"] as? [String] == ["f2", "f1"])
    #expect(t["checked"] as? [String] == ["i1", "i3"])
}

@Test func libraryToJsonKeyOrderMatchesTypeScript() {
    let l = Library(
        items: [Item(id: i1, name: "H", notes: "n")],
        kits: [Kit(id: f1, name: "K", itemIds: [i1])],
        trips: [Trip(id: t1, name: "T", createdAt: "c", kitIds: [f1], archived: true, checked: [i1])])
    let expected = """
    {
      "items": [
        {
          "id": "i1",
          "name": "H",
          "notes": "n"
        }
      ],
      "kits": [
        {
          "id": "f1",
          "name": "K",
          "itemIds": [
            "i1"
          ]
        }
      ],
      "trips": [
        {
          "id": "t1",
          "name": "T",
          "createdAt": "c",
          "kitIds": [
            "f1"
          ],
          "checked": [
            "i1"
          ],
          "archived": true
        }
      ]
    }

    """
    #expect(libraryToJson(l) == expected)
}

// loadLibrary

@Test func loadLibraryFromNil() { #expect(loadLibrary(nil).items.count == 0) }
@Test func loadLibraryFromNull() { #expect(loadLibrary(NSNull()).items.count == 0) }
@Test func loadLibraryFromGarbage() throws {
    #expect(loadLibrary("string") == Library())
    #expect(loadLibrary(42) == Library())
    #expect(loadLibrary([1, 2]) == Library())
    #expect(try loadLibrary(json: "[1,2]") == Library())
    #expect(throws: (any Error).self) { try loadLibrary(json: "not json") }
}

@Test func loadLibraryFromEmptyObject() {
    let l = loadLibrary([String: Any]())
    #expect(l.items.count == 0)
    #expect(l.kits.count == 0)
    #expect(l.trips.count == 0)
}

@Test func loadLibraryLoadsItems() {
    let l = loadLibrary(["items": [["id": "i1", "name": "Headlamp", "notes": "BD"]]])
    #expect(l.items[0].id == i1)
    #expect(l.items[0].name == "Headlamp")
    #expect(l.items[0].notes == "BD")
}

@Test func loadLibraryItemsWithoutNotesOmitTheField() {
    let l = loadLibrary(["items": [["id": "i1", "name": "Headlamp"]]])
    #expect(l.items[0].notes == nil)
}

@Test func loadLibraryLoadsKitItemIdsAsArray() {
    let l = loadLibrary(["kits": [["id": "f1", "name": "Trad", "itemIds": ["i1", "i2"]]]])
    #expect(l.kits[0].itemIds == [i1, i2])
}

@Test func loadLibraryLoadsTripCheckedAsSet() {
    let l = loadLibrary(["trips": [[
        "id": "t1", "name": "Test", "createdAt": "2025-01-01", "kitIds": ["f1"], "checked": ["i1", "i2"],
    ]]])
    #expect(l.trips[0].kitIds == [f1])
    #expect(l.trips[0].checked == [i1, i2])
}

@Test func loadLibraryHandlesMissingKitItemIds() {
    #expect(loadLibrary(["kits": [["id": "f1", "name": "Trad"]]]).kits[0].itemIds == [])
}

@Test func loadLibraryHandlesMissingTripKitIdsAndChecked() {
    let l = loadLibrary(["trips": [["id": "t1", "name": "Test", "createdAt": "2025-01-01"]]])
    #expect(l.trips[0].kitIds == [])
    #expect(l.trips[0].checked == [])
}

// dedup

@Test func loadLibraryDeduplicatesItemsById() {
    let l = loadLibrary(["items": [["id": "i1", "name": "First"], ["id": "i1", "name": "Duplicate"]]])
    #expect(l.items.count == 1)
    #expect(l.items[0].name == "First")
}

@Test func loadLibraryDeduplicatesKitsById() {
    let l = loadLibrary(["kits": [["id": "f1", "name": "First", "itemIds": []], ["id": "f1", "name": "Duplicate", "itemIds": []]]])
    #expect(l.kits.count == 1)
    #expect(l.kits[0].name == "First")
}

@Test func loadLibraryDeduplicatesTripsById() {
    let l = loadLibrary(["trips": [
        ["id": "t1", "name": "First", "createdAt": "2025-01-01"],
        ["id": "t1", "name": "Duplicate", "createdAt": "2025-01-01"],
    ]])
    #expect(l.trips.count == 1)
    #expect(l.trips[0].name == "First")
}

@Test func loadLibraryDeduplicatesKitItemIds() {
    let l = loadLibrary(["kits": [["id": "f1", "name": "Trad", "itemIds": ["i1", "i2", "i1"]]]])
    #expect(l.kits[0].itemIds == [i1, i2])
}

@Test func loadLibraryDeduplicatesTripKitIds() {
    let l = loadLibrary(["trips": [["id": "t1", "name": "Test", "createdAt": "2025-01-01", "kitIds": ["f1", "f2", "f1"]]]])
    #expect(l.trips[0].kitIds == [f1, f2])
}

// Round-trip

@Test func roundTripEmptyLibrary() throws {
    #expect(try roundTrip(Library()) == Library())
}

@Test func roundTripLibraryWithData() throws {
    let original = Library(
        items: [Item(id: i1, name: "Headlamp", notes: "BD Spot"), Item(id: i2, name: "Harness")],
        kits: [Kit(id: f1, name: "Trad Rack", itemIds: [i1, i2]), Kit(id: f2, name: "Camp", itemIds: [])],
        trips: [makeTrip(t1, "Squamish", "2025-07-15", [f1, f2], [i1])])
    #expect(try roundTrip(original) == original)
}

@Test func propertyRoundTripPreservesAllData() throws {
    try forAll { rng in
        let itemIdStrs = randomUniqueStrings(&rng, min: 0, max: 5, maxLen: 10)
        let items = itemIdStrs.map { s -> Item in
            let notes: String? = Bool.random(using: &rng) ? randomString(&rng, max: 30) : nil
            return Item(id: ItemId(s), name: randomName(&rng), notes: notes)
        }
        let iIds = items.map(\.id)
        let kitIdStrs = randomUniqueStrings(&rng, min: 0, max: 3, maxLen: 10)
        let kits = kitIdStrs.map { Kit(id: KitId($0), name: randomName(&rng), itemIds: randomSubarray(iIds, &rng)) }
        let fIds = kits.map(\.id)
        let tripIdStrs = randomUniqueStrings(&rng, min: 0, max: 3, maxLen: 10)
        let trips = tripIdStrs.map {
            Trip(id: TripId($0), name: randomName(&rng), createdAt: randomString(&rng, max: 20),
                 kitIds: randomSubarray(fIds, &rng), checked: Set(randomSubarray(iIds, &rng)))
        }
        let store = Library(items: items, kits: kits, trips: trips)
        let rt = try roundTrip(store)
        #expect(rt == store)
    }
}

// deletion

@Test func deleteLibraryItemRemovesReferencesAcrossKitsAndPackingProgress() {
    let original = Library(
        items: [Item(id: i1, name: "Charger"), Item(id: i2, name: "Sunscreen")],
        kits: [Kit(id: f1, name: "Essentials", itemIds: [i1]), Kit(id: f2, name: "Beach", itemIds: [i1, i2])],
        trips: [makeTrip(t1, "Coast", "2026-11-10", [f1, f2], [i1, i2])])
    let result = deleteLibraryItem(original, id: i1)
    #expect(result.items.map(\.id) == [i2])
    #expect(result.kits.map(\.itemIds) == [[], [i2]])
    #expect(result.trips[0].checked == [i2])
    #expect(original.kits[0].itemIds == [i1])
    #expect(original.trips[0].checked == [i1, i2])
}

@Test func deleteLibraryKitUpdatesEveryTripWithoutDeletingLibraryItems() {
    let original = Library(
        items: [Item(id: i1, name: "Charger")],
        kits: [Kit(id: f1, name: "Essentials", itemIds: [i1]), Kit(id: f2, name: "Beach", itemIds: [i1])],
        trips: [makeTrip(t1, "Coast", "2026-11-10", [f1, f2], [i1])])
    let result = deleteLibraryKit(original, id: f1)
    #expect(result.kits.map(\.id) == [f2])
    #expect(result.trips[0].kitIds == [f2])
    #expect(result.items == original.items)
    #expect(result.trips[0].checked == [i1])
    #expect(original.trips[0].kitIds == [f1, f2])
}

@Test func archiveStatusRoundTripsWhileLegacyTripsRemainActive() throws {
    let data: [String: Any] = [
        "items": [], "kits": [],
        "trips": [["id": "t1", "name": "Old", "createdAt": "2026-11-10", "archived": true]],
    ]
    #expect(try roundTrip(loadLibrary(data)).trips[0].archived == true)
    #expect(loadLibrary(["trips": [["id": "t1", "name": "Legacy"]]]).trips[0].archived == nil)
    #expect(loadLibrary(["trips": [["id": "t1", "name": "Bad flag", "archived": "false"]]]).trips[0].archived == nil)
}
