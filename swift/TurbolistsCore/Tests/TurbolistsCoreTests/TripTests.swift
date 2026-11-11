import Testing
@testable import TurbolistsCore

private let t1: TripId = "t1"
private let t2: TripId = "t2"
private let f1: KitId = "f1"
private let f2: KitId = "f2"
private let i1: ItemId = "i1"
private let i2: ItemId = "i2"

private func fresh() throws -> [Trip] { try createTrip([], id: t1, name: "Squamish", createdAt: "2025-07-15") }

@Test func createTripCreatesTrip() throws {
    let trips = try fresh()
    #expect(trips.count == 1)
    #expect(trips[0].id == t1)
    #expect(trips[0].name == "Squamish")
    #expect(trips[0].createdAt == "2025-07-15")
    #expect(trips[0].kitIds == [])
    #expect(trips[0].checked == [])
}

@Test func createTripAppendsToExistingTrips() throws {
    var trips: [Trip] = []
    trips = try createTrip(trips, id: t1, name: "Squamish", createdAt: "2025-07-15")
    trips = try createTrip(trips, id: t2, name: "Smith Rock", createdAt: "2025-08-01")
    #expect(trips.count == 2)
}

@Test func createTripThrowsOnEmptyName() {
    #expect(throws: InvariantViolation.self) { try createTrip([], id: t1, name: "", createdAt: "2025-07-15") }
}

@Test func createTripThrowsOnDuplicateId() throws {
    let trips = try fresh()
    #expect(throws: InvariantViolation.self) { try createTrip(trips, id: t1, name: "Smith Rock", createdAt: "2025-08-01") }
}

@Test func renameTripRenamesExistingTrip() throws {
    #expect(try renameTrip(fresh(), id: t1, name: "Squamish v2")[0].name == "Squamish v2")
}

@Test func renameTripPreservesOtherFields() throws {
    var trips = try fresh()
    trips = try addKitToTrip(trips, tripId: t1, kitId: f1)
    trips = try toggleChecked(trips, tripId: t1, itemId: i1)
    let renamed = try renameTrip(trips, id: t1, name: "New Name")
    #expect(renamed[0].kitIds == [f1])
    #expect(renamed[0].checked == [i1])
    #expect(renamed[0].createdAt == "2025-07-15")
}

@Test func renameTripThrowsOnMissingTrip() {
    #expect(throws: InvariantViolation.self) { try renameTrip([], id: t1, name: "New Name") }
}

@Test func renameTripThrowsOnEmptyName() throws {
    let trips = try fresh()
    #expect(throws: InvariantViolation.self) { try renameTrip(trips, id: t1, name: "") }
}

@Test func addKitToTripAddsKit() throws {
    #expect(try addKitToTrip(fresh(), tripId: t1, kitId: f1)[0].kitIds == [f1])
}

@Test func addKitToTripAddsMultipleKitsPreservingOrder() throws {
    var trips = try fresh()
    trips = try addKitToTrip(trips, tripId: t1, kitId: f2)
    trips = try addKitToTrip(trips, tripId: t1, kitId: f1)
    #expect(trips[0].kitIds == [f2, f1])
}

@Test func addKitToTripIdempotent() throws {
    var trips = try fresh()
    trips = try addKitToTrip(trips, tripId: t1, kitId: f1)
    trips = try addKitToTrip(trips, tripId: t1, kitId: f1)
    #expect(trips[0].kitIds == [f1])
}

@Test func addKitToTripThrowsOnNonexistentTrip() {
    #expect(throws: InvariantViolation.self) { try addKitToTrip([], tripId: t1, kitId: f1) }
}

@Test func removeKitFromTripRemovesKit() throws {
    var trips = try fresh()
    trips = try addKitToTrip(trips, tripId: t1, kitId: f1)
    #expect(try removeKitFromTrip(trips, tripId: t1, kitId: f1)[0].kitIds == [])
}

@Test func removeKitFromTripPreservesOtherKitsAndOrder() throws {
    var trips = try fresh()
    trips = try addKitToTrip(trips, tripId: t1, kitId: f1)
    trips = try addKitToTrip(trips, tripId: t1, kitId: f2)
    #expect(try removeKitFromTrip(trips, tripId: t1, kitId: f1)[0].kitIds == [f2])
}

@Test func removeKitFromTripThrowsOnNonexistentTrip() {
    #expect(throws: InvariantViolation.self) { try removeKitFromTrip([], tripId: t1, kitId: f1) }
}

@Test func toggleCheckedChecksAnItem() throws {
    #expect(try toggleChecked(fresh(), tripId: t1, itemId: i1)[0].checked == [i1])
}

@Test func toggleCheckedUnchecksACheckedItem() throws {
    var trips = try fresh()
    trips = try toggleChecked(trips, tripId: t1, itemId: i1)
    trips = try toggleChecked(trips, tripId: t1, itemId: i1)
    #expect(trips[0].checked == [])
}

@Test func toggleCheckedPreservesOtherCheckedItems() throws {
    var trips = try fresh()
    trips = try toggleChecked(trips, tripId: t1, itemId: i1)
    trips = try toggleChecked(trips, tripId: t1, itemId: i2)
    trips = try toggleChecked(trips, tripId: t1, itemId: i1)
    #expect(trips[0].checked == [i2])
}

@Test func toggleCheckedThrowsOnNonexistentTrip() {
    #expect(throws: InvariantViolation.self) { try toggleChecked([], tripId: t1, itemId: i1) }
}

@Test func resetChecksClearsAllCheckedItems() throws {
    var trips = try fresh()
    trips = try toggleChecked(trips, tripId: t1, itemId: i1)
    trips = try toggleChecked(trips, tripId: t1, itemId: i2)
    #expect(try resetChecks(trips, tripId: t1)[0].checked == [])
}

@Test func resetChecksNoOpOnAlreadyEmpty() throws {
    #expect(try resetChecks(fresh(), tripId: t1)[0].checked == [])
}

@Test func resetChecksThrowsOnNonexistentTrip() {
    #expect(throws: InvariantViolation.self) { try resetChecks([], tripId: t1) }
}

@Test func deleteTripRemovesTrip() throws {
    #expect(try deleteTrip(fresh(), id: t1).count == 0)
}

@Test func deleteTripPreservesOtherTrips() throws {
    var trips: [Trip] = []
    trips = try createTrip(trips, id: t1, name: "Squamish", createdAt: "2025-07-15")
    trips = try createTrip(trips, id: t2, name: "Smith Rock", createdAt: "2025-08-01")
    let deleted = try deleteTrip(trips, id: t1)
    #expect(deleted.count == 1)
    #expect(deleted[0].name == "Smith Rock")
}

@Test func deleteTripThrowsOnMissingTrip() {
    #expect(throws: InvariantViolation.self) { try deleteTrip([], id: t1) }
}

// Property-based tests

@Test func propertyToggleIsSelfInverse() throws {
    try forAll { rng in
        let id = ItemId(randomString(&rng, max: 10))
        var trips = try createTrip([], id: t1, name: "Test", createdAt: "2025-01-01")
        trips = try toggleChecked(trips, tripId: t1, itemId: id)
        trips = try toggleChecked(trips, tripId: t1, itemId: id)
        #expect(trips[0].checked == [])
    }
}

@Test func propertyResetChecksAlwaysYieldsEmptyCheckedSet() throws {
    try forAll { rng in
        var trips = try createTrip([], id: t1, name: "Test", createdAt: "2025-01-01")
        for _ in 0..<Int.random(in: 0...10, using: &rng) {
            trips = try toggleChecked(trips, tripId: t1, itemId: ItemId(randomString(&rng, max: 10)))
        }
        #expect(try resetChecks(trips, tripId: t1)[0].checked == [])
    }
}

@Test func propertyAddThenRemoveKitIsIdentityOnKitIds() throws {
    try forAll { rng in
        let fId = [f1, f2].randomElement(using: &rng)!
        var trips = try createTrip([], id: t1, name: "Test", createdAt: "2025-01-01")
        trips = try addKitToTrip(trips, tripId: t1, kitId: fId)
        #expect(try removeKitFromTrip(trips, tripId: t1, kitId: fId)[0].kitIds == [])
    }
}

@Test func duplicateTripReusesKitsWithFreshProgressAndLeavesTheOriginalIntact() throws {
    let source = try toggleChecked(
        addKitToTrip(createTrip([], id: t1, name: "Coast", createdAt: "2026-01-01"), tripId: t1, kitId: f1),
        tripId: t1, itemId: i1)
    let result = try duplicateTrip(source, sourceId: t1, id: t2, name: "Coast again", createdAt: "2026-11-10")
    #expect(result[0] == source[0])
    #expect(result[1] == Trip(id: t2, name: "Coast again", createdAt: "2026-11-10", kitIds: [f1], checked: []))
    let changed = try toggleChecked(removeKitFromTrip(result, tripId: t2, kitId: f1), tripId: t2, itemId: i2)
    #expect(changed[0].kitIds == [f1])
    #expect(changed[0].checked == [i1])
}

@Test func duplicateTripRejectsMissingSourcesDuplicateIDsAndEmptyNames() throws {
    let source = try createTrip([], id: t1, name: "Coast", createdAt: "2026-01-01")
    #expect(throws: InvariantViolation.self) { try duplicateTrip(source, sourceId: t2, id: "t3", name: "Copy", createdAt: "2026-11-10") }
    #expect(throws: InvariantViolation.self) { try duplicateTrip(source, sourceId: t1, id: t1, name: "Copy", createdAt: "2026-11-10") }
    #expect(throws: InvariantViolation.self) { try duplicateTrip(source, sourceId: t1, id: t2, name: "   ", createdAt: "2026-11-10") }
}

@Test func archivingPreservesPackingProgressCanBeRestoredAndCopiesStartActive() throws {
    let original = try toggleChecked(
        addKitToTrip(createTrip([], id: t1, name: "Coast", createdAt: "2026-11-10"), tripId: t1, kitId: f1),
        tripId: t1, itemId: i1)
    let archived = try setTripArchived(original, id: t1, archived: true)
    #expect(archived[0].archived == true)
    #expect(archived[0].checked == original[0].checked)
    #expect(archived[0].kitIds == original[0].kitIds)
    #expect(original[0].archived == nil)
    #expect(try setTripArchived(archived, id: t1, archived: false)[0].archived == false)
    #expect(try duplicateTrip(archived, sourceId: t1, id: t2, name: "Again", createdAt: "2026-11-11")[1].archived == nil)
    #expect(throws: InvariantViolation.self) { try setTripArchived(original, id: t2, archived: true) }
}
