import Foundation
@testable import TurbolistsCore

/// Small seeded generator (SplitMix64) so property tests are reproducible.
struct SeededRNG: RandomNumberGenerator {
    var state: UInt64
    init(seed: UInt64) { state = seed }
    mutating func next() -> UInt64 {
        state &+= 0x9E37_79B9_7F4A_7C15
        var z = state
        z = (z ^ (z >> 30)) &* 0xBF58_476D_1CE4_E5B9
        z = (z ^ (z >> 27)) &* 0x94D0_49BB_1331_11EB
        return z ^ (z >> 31)
    }
}

let propertyIterations = 100

/// Runs `body` with a fresh seeded RNG per iteration.
func forAll(seed: UInt64 = 42, _ body: (inout SeededRNG) throws -> Void) rethrows {
    for i in 0..<propertyIterations {
        var rng = SeededRNG(seed: seed &+ UInt64(i))
        try body(&rng)
    }
}

private let alphabet: [Character] = Array("abcXYZ019 _-\"\\/\n\t\u{00E9}\u{1F600}")

func randomString(_ rng: inout SeededRNG, min: Int = 1, max: Int) -> String {
    let n = Int.random(in: min...max, using: &rng)
    return String((0..<n).map { _ in alphabet.randomElement(using: &rng)! })
}

func randomName(_ rng: inout SeededRNG, max: Int = 20) -> String {
    while true {
        let s = randomString(&rng, max: max)
        if !s.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { return s }
    }
}

func randomSubarray<T>(_ xs: [T], _ rng: inout SeededRNG) -> [T] {
    xs.filter { _ in Bool.random(using: &rng) }
}

func randomUniqueStrings(_ rng: inout SeededRNG, min: Int, max: Int, maxLen: Int) -> [String] {
    let n = Int.random(in: min...max, using: &rng)
    var seen = Set<String>()
    var out: [String] = []
    var guardCount = 0
    while out.count < n && guardCount < 1000 {
        guardCount += 1
        let s = randomString(&rng, max: maxLen)
        if seen.insert(s).inserted { out.append(s) }
    }
    return out
}
