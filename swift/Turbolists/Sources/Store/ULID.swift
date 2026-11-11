import Foundation

/// Minimal ULID generator (48-bit ms timestamp + 80 bits randomness, Crockford base32).
enum ULID {
    private static let alphabet = Array("0123456789ABCDEFGHJKMNPQRSTVWXYZ")

    static func generate(now: Date = Date()) -> String {
        var ms = UInt64(max(0, now.timeIntervalSince1970 * 1000))
        var time = [Character](repeating: "0", count: 10)
        for i in stride(from: 9, through: 0, by: -1) {
            time[i] = alphabet[Int(ms % 32)]
            ms /= 32
        }
        var rng = SystemRandomNumberGenerator()
        let random = (0..<16).map { _ in alphabet[Int(rng.next() % 32)] }
        return String(time) + String(random)
    }
}
