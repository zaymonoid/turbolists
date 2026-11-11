import Foundation
import KitbagCore

/// JSON-file persistence in Application Support. Writes are atomic
/// (temp file in the same directory, fsync, rename) and serialized.
struct PersistenceService: Sendable {
    var url: URL

    static var defaultURL: URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        return base.appendingPathComponent("Kitbag", isDirectory: true)
            .appendingPathComponent("store.json")
    }

    init(url: URL = PersistenceService.defaultURL) { self.url = url }

    /// Serializes writes so they land in order.
    private static let writeQueue = DispatchQueue(label: "kitbag.persistence.write")

    /// Missing file reads as an empty library (like the Rust side returning "{}").
    func read() throws -> Library {
        let json: String
        do { json = try String(contentsOf: url, encoding: .utf8) }
        catch let e as CocoaError where e.code == .fileReadNoSuchFile || e.code == .fileNoSuchFile {
            return Library()
        }
        return try loadLibrary(json: json)
    }

    func write(_ library: Library) throws {
        let json = libraryToJson(library)
        try Self.writeQueue.sync { try writeAtomically(Data(json.utf8)) }
    }

    /// Enqueues a write on the serial queue and returns immediately. Writes (and their
    /// completions) run strictly in call order, so an older snapshot can never land last.
    func enqueueWrite(_ library: Library, completion: @escaping @Sendable (Result<Void, Error>) -> Void) {
        Self.writeQueue.async {
            let json = libraryToJson(library)
            completion(Result { try writeAtomically(Data(json.utf8)) })
        }
    }

    private func writeAtomically(_ data: Data) throws {
        let fm = FileManager.default
        try fm.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        let tmp = url.appendingPathExtension("tmp")
        do {
            try data.write(to: tmp, options: [])
            let handle = try FileHandle(forWritingTo: tmp)
            try handle.synchronize()
            try handle.close()
            if fm.fileExists(atPath: url.path) {
                _ = try fm.replaceItemAt(url, withItemAt: tmp)
            } else {
                try fm.moveItem(at: tmp, to: url)
            }
        } catch {
            try? fm.removeItem(at: tmp)
            throw error
        }
    }
}
