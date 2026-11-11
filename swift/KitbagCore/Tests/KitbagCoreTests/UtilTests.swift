import Testing
@testable import KitbagCore

// MARK: dedupe

@Test func dedupeEmptyArray() { #expect(dedupe([String]()) == []) }
@Test func dedupeNoDuplicates() { #expect(dedupe(["a", "b", "c"]) == ["a", "b", "c"]) }
@Test func dedupeRemovesDuplicates() { #expect(dedupe(["a", "b", "a", "c", "b"]) == ["a", "b", "c"]) }
@Test func dedupePreservesFirstOccurrenceOrder() { #expect(dedupe(["c", "a", "b", "a", "c"]) == ["c", "a", "b"]) }

@Test func propertyDedupeOutputHasNoDuplicatesAndSameUniqueSet() {
    forAll { rng in
        let n = Int.random(in: 0...20, using: &rng)
        let ids = (0..<n).map { _ in randomString(&rng, max: 2) }
        let result = dedupe(ids)
        for id in result { #expect(ids.contains(id)) }
        #expect(Set(result).count == result.count)
        #expect(Set(result) == Set(ids))
    }
}

// MARK: invariant

@Test func invariantPassesOnTruthyCondition() throws {
    try invariant(true, "should not throw")
    try invariant(1 == 1, "should not throw")
    try invariant(!"non-empty".isEmpty, "should not throw")
}

@Test func invariantThrowsOnFalsyCondition() {
    #expect(throws: InvariantViolation("test message")) { try invariant(false, "test message") }
    do { try invariant(false, "test message") } catch {
        #expect("\(error)" == "Invariant violation: test message")
    }
}

@Test func invariantThrowsOnNull() {
    let value: String? = nil
    #expect(throws: InvariantViolation("null check")) { try invariant(value != nil, "null check") }
}

@Test func invariantThrowsOnUndefined() {
    let value: Int? = nil
    #expect(throws: InvariantViolation("undefined check")) { try invariant(value != nil, "undefined check") }
}

@Test func invariantNarrowsType() throws {
    let value: String? = "hello"
    try invariant(value != nil, "should be non-null")
    #expect(value!.count == 5)
}
