import Testing
@testable import KitbagCore

private let f1: KitId = "f1", f2: KitId = "f2", f3: KitId = "f3"
private let i1: ItemId = "i1", i2: ItemId = "i2", i3: ItemId = "i3", i4: ItemId = "i4", i5: ItemId = "i5"

private let kits: [Kit] = [
    Kit(id: f1, name: "Trad Rack", itemIds: [i1, i2, i3]),
    Kit(id: f2, name: "Camp Kitchen", itemIds: [i3, i4]),
    Kit(id: f3, name: "Sleep System", itemIds: [i5]),
]

private func makeTrip(_ fIds: [KitId], _ checked: [ItemId] = []) -> Trip {
    Trip(id: "t1", name: "Test", createdAt: "2025-01-01", kitIds: fIds, checked: Set(checked))
}

private let fiveItems = [
    Item(id: i1, name: "A"), Item(id: i2, name: "B"), Item(id: i3, name: "C"),
    Item(id: i4, name: "D"), Item(id: i5, name: "E"),
]

// tripChecklist

@Test func tripChecklistEmptyKitsYieldsEmptyChecklist() { #expect(tripChecklist(makeTrip([]), kits: kits) == []) }
@Test func tripChecklistSingleKitReturnsItsItemsInOrder() { #expect(tripChecklist(makeTrip([f1]), kits: kits) == [i1, i2, i3]) }
@Test func tripChecklistUnionOfMultipleKitsDeduplicatesPreservesSubOrder() {
    #expect(tripChecklist(makeTrip([f1, f2]), kits: kits) == [i1, i2, i3, i4])
}
@Test func tripChecklistAllKits() { #expect(tripChecklist(makeTrip([f1, f2, f3]), kits: kits) == [i1, i2, i3, i4, i5]) }
@Test func tripChecklistKitOrderMatters() { #expect(tripChecklist(makeTrip([f2, f1]), kits: kits) == [i3, i4, i1, i2]) }
@Test func tripChecklistSkipsUnknownKitIds() { #expect(tripChecklist(makeTrip([f1, "deleted"]), kits: kits) == [i1, i2, i3]) }
@Test func tripChecklistAllUnknownKitsYieldsEmpty() { #expect(tripChecklist(makeTrip(["d1", "d2"]), kits: kits) == []) }

// packProgress

@Test func packProgressNothingChecked() { #expect(packProgress(makeTrip([f1]), kits: kits) == PackProgress(checked: 0, total: 3)) }
@Test func packProgressAllChecked() { #expect(packProgress(makeTrip([f1], [i1, i2, i3]), kits: kits) == PackProgress(checked: 3, total: 3)) }
@Test func packProgressPartialChecked() { #expect(packProgress(makeTrip([f1, f2], [i1, i3]), kits: kits) == PackProgress(checked: 2, total: 4)) }
@Test func packProgressCheckedItemsNotInChecklistAreIgnored() {
    #expect(packProgress(makeTrip([f3], [i1, i5]), kits: kits) == PackProgress(checked: 1, total: 1))
}
@Test func packProgressEmptyTrip() { #expect(packProgress(makeTrip([]), kits: kits) == PackProgress(checked: 0, total: 0)) }
@Test func packProgressWithDeletedKits() {
    #expect(packProgress(makeTrip([f3, "deleted"], [i5]), kits: kits) == PackProgress(checked: 1, total: 1))
}

// itemUsage

@Test func itemUsageMapsItemsToTheirKits() {
    let usage = itemUsage(fiveItems, kits: kits)
    #expect(usage[i1] == [f1])
    #expect(usage[i2] == [f1])
    #expect(usage[i3] == [f1, f2])
    #expect(usage[i4] == [f2])
    #expect(usage[i5] == [f3])
}
@Test func itemUsageUnreferencedItemHasEmptySet() {
    let orphan: ItemId = "i99"
    #expect(itemUsage([Item(id: orphan, name: "Orphan")], kits: kits)[orphan] == [])
}
@Test func itemUsageEmptyItems() { #expect(itemUsage([], kits: kits).isEmpty) }
@Test func itemUsageEmptyKits() { #expect(itemUsage([Item(id: i1, name: "A")], kits: [])[i1] == []) }

// kitUsage (no TS test existed; added for coverage)

@Test func kitUsageCountsTripsPerKitAndIgnoresUnknownKits() {
    let trips = [makeTrip([f1, f2]), makeTrip([f1, "deleted"])]
    let usage = kitUsage(kits, trips: trips)
    #expect(usage == [f1: 2, f2: 1, f3: 0])
}

// Property-based tests

@Test func propertyCheckedCountNeverExceedsTotal() {
    forAll { rng in
        let trip = makeTrip(randomSubarray([f1, f2, f3], &rng), randomSubarray([i1, i2, i3, i4, i5], &rng))
        let p = packProgress(trip, kits: kits)
        #expect(p.checked <= p.total)
    }
}

@Test func propertyChecklistItemsAreSubsetOfAllKitItems() {
    forAll { rng in
        let checklist = tripChecklist(makeTrip(randomSubarray([f1, f2, f3], &rng)), kits: kits)
        let all = Set(kits.flatMap(\.itemIds))
        for id in checklist { #expect(all.contains(id)) }
    }
}

@Test func propertyChecklistHasNoDuplicates() {
    forAll { rng in
        let checklist = tripChecklist(makeTrip(randomSubarray([f1, f2, f3], &rng)), kits: kits)
        #expect(Set(checklist).count == checklist.count)
    }
}

@Test func propertyItemUsageCoversEveryItemInEveryKit() {
    let usage = itemUsage(fiveItems, kits: kits)
    for kit in kits { for id in kit.itemIds { #expect(usage[id]!.contains(kit.id)) } }
}

@Test func formatTripChecklistPreservesProgressAndFirstOccurrenceOrderAcrossSharedKits() {
    let trip = makeTrip([f1, f2], [i1, i4, i5])
    #expect(formatTripChecklist(trip, kits: kits, items: [
        Item(id: i1, name: "Headlamp"), Item(id: i2, name: "Jacket"),
        Item(id: i3, name: "Water"), Item(id: i4, name: "Stove"),
    ]) == "Test\n2 of 4 packed\n\n- [x] Headlamp\n- [ ] Jacket\n- [ ] Water\n- [x] Stove")
}

@Test func formatTripChecklistSkipsMissingReferencesAndIndentsNotes() {
    #expect(formatTripChecklist(makeTrip([f1, f2, f3], [i1, i2]), kits: kits, items: [
        Item(id: i1, name: "Warm\n jacket", notes: "Waterproof\nCheck pockets"),
    ]) == "Test\n1 of 1 packed\n\n- [x] Warm jacket\n    Waterproof\n    Check pockets")
    #expect(formatTripChecklist(makeTrip([]), kits: kits, items: []) == "Test\n0 of 0 packed")
}
