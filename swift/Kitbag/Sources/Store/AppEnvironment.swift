import Foundation

struct AppEnvironment: Sendable {
    var persistence: PersistenceService
    /// Debounce before auto-save (TS: 500 ms).
    var saveDelay: TimeInterval

    init(persistence: PersistenceService = PersistenceService(), saveDelay: TimeInterval = 0.5) {
        self.persistence = persistence
        self.saveDelay = saveDelay
    }
}
