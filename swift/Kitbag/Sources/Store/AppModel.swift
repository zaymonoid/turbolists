import Combine
import Foundation
import ObservableStore
import OSLog
import KitbagCore

private let logger = Logger(subsystem: "com.kitbag.swiftui", category: "store")

struct UndoSnapshot: Equatable, Sendable {
    var data: Library
    var message: String
}

/// Mirrors the TS `AppState`.
struct AppModel: ModelProtocol {
    typealias Action = AppAction
    typealias Environment = AppEnvironment

    var data = Library()
    var view: AppView = .trips
    var loadStatus: LoadStatus = .loading
    var persistence: PersistenceStatus = .saved
    var undo: UndoSnapshot? = nil
    var selectedTripId: TripId? = nil
    var selectedKitId: KitId? = nil
    /// Debounce token: bumped by every data action; a `.saveDue` only saves if it is still current.
    var saveGeneration = 0

    init() {}

    // MARK: update

    static func update(state: AppModel, action: AppAction, environment: AppEnvironment) -> Update<AppModel> {
        switch action {
        // Persistence / lifecycle (effects)
        case .start:
            // Never reload over in-memory edits once loaded.
            guard state.loadStatus != .ready else { return Update(state: state) }
            var next = state
            next.loadStatus = .loading
            return Update(state: next, fx: loadFx(environment))
        case .loaded(let library):
            var next = state
            next.data = library
            next.loadStatus = .ready
            next.undo = nil
            return Update(state: next)
        case .loadFailed:
            var next = state
            next.loadStatus = .error
            return Update(state: next)
        case .saveStatus(let status):
            var next = state
            next.persistence = status
            return Update(state: next)
        case .retrySave:
            return scheduleSave(state, environment)
        case .flushSave:
            guard state.loadStatus == .ready else { return Update(state: state) }
            return Update(state: state, fx: saveFx(state.data, environment))
        case .saveDue(let generation):
            guard generation == state.saveGeneration, state.loadStatus == .ready else {
                return Update(state: state)
            }
            return Update(state: state, fx: saveFx(state.data, environment))

        // Navigation
        case .setView(let view):
            var next = state; next.view = view
            return Update(state: next)
        case .selectTrip(let id):
            var next = state; next.selectedTripId = id
            return Update(state: next)
        case .selectKit(let id):
            var next = state; next.selectedKitId = id
            return Update(state: next)

        // Recovery
        case .undo:
            guard let snapshot = state.undo else { return Update(state: state) }
            var next = state
            next.data = snapshot.data
            next.undo = nil
            return scheduleSave(next, environment)
        case .dismissUndo:
            var next = state; next.undo = nil
            return Update(state: next)

        // Data mutations
        default:
            guard var next = try? reduceData(state, action) else {
                // TS lets a core invariant error propagate out of the reducer, so
                // the action has no effect. Same here: state unchanged, no undo, no save.
                logger.error("action failed (invariant): \(String(describing: action), privacy: .public)")
                return Update(state: state)
            }
            let message = action.undoMessage
            next.undo = message.map { UndoSnapshot(data: state.data, message: $0) }
            return scheduleSave(next, environment)
        }
    }

    private static func reduceData(_ state: AppModel, _ action: AppAction) throws -> AppModel {
        var next = state
        switch action {
        case .createItem(let id, let name): next.data.items = try createItem(state.data.items, id: id, name: name)
        case .renameItem(let id, let name): next.data.items = try renameItem(state.data.items, id: id, name: name)
        case .deleteItem(let id): next.data = deleteLibraryItem(state.data, id: id)
        case .createKit(let id, let name): next.data.kits = try createKit(state.data.kits, id: id, name: name)
        case .renameKit(let id, let name): next.data.kits = try renameKit(state.data.kits, id: id, name: name)
        case .deleteKit(let id):
            next.data = deleteLibraryKit(state.data, id: id)
            if state.selectedKitId == id { next.selectedKitId = nil }
        case .addItemToKit(let kitId, let itemId):
            next.data.kits = try addItemToKit(state.data.kits, id: kitId, itemId: itemId)
        case .removeItemFromKit(let kitId, let itemId):
            next.data.kits = try removeItemFromKit(state.data.kits, id: kitId, itemId: itemId)
        case .moveItemInKit(let kitId, let itemId, let toIndex):
            next.data.kits = try moveItemInKit(state.data.kits, id: kitId, itemId: itemId, toIndex: toIndex)
        case .createTrip(let id, let name, let createdAt):
            next.data.trips = try createTrip(state.data.trips, id: id, name: name, createdAt: createdAt)
        case .duplicateTrip(let sourceId, let id, let name, let createdAt):
            next.data.trips = try duplicateTrip(state.data.trips, sourceId: sourceId, id: id, name: name, createdAt: createdAt)
        case .setTripArchived(let id, let archived):
            next.data.trips = try setTripArchived(state.data.trips, id: id, archived: archived)
        case .renameTrip(let id, let name): next.data.trips = try renameTrip(state.data.trips, id: id, name: name)
        case .deleteTrip(let id):
            next.data.trips = try deleteTrip(state.data.trips, id: id)
            if state.selectedTripId == id { next.selectedTripId = nil }
        case .addKitToTrip(let tripId, let kitId):
            next.data.trips = try addKitToTrip(state.data.trips, tripId: tripId, kitId: kitId)
        case .removeKitFromTrip(let tripId, let kitId):
            next.data.trips = try removeKitFromTrip(state.data.trips, tripId: tripId, kitId: kitId)
        case .toggleChecked(let tripId, let itemId):
            next.data.trips = try toggleChecked(state.data.trips, tripId: tripId, itemId: itemId)
        case .resetChecks(let tripId): next.data.trips = try resetChecks(state.data.trips, tripId: tripId)
        default: break
        }
        return next
    }

    // MARK: effects

    /// Bump the debounce token and start a delayed `.saveDue` (only the latest one saves).
    private static func scheduleSave(_ state: AppModel, _ env: AppEnvironment) -> Update<AppModel> {
        var next = state
        next.saveGeneration += 1
        let generation = next.saveGeneration
        let fx = Just(AppAction.saveDue(generation: generation))
            .delay(for: .seconds(env.saveDelay), scheduler: DispatchQueue.main)
            .eraseToAnyPublisher()
        return Update(state: next, fx: fx)
    }

    private static func loadFx(_ env: AppEnvironment) -> Fx<AppAction> {
        Future<AppAction, Never> { promise in
            DispatchQueue.global(qos: .userInitiated).async {
                do { promise(.success(.loaded(try env.persistence.read()))) }
                catch {
                    logger.error("load failed: \(error.localizedDescription, privacy: .public)")
                    promise(.success(.loadFailed))
                }
            }
        }.eraseToAnyPublisher()
    }

    /// Writes are serialized inside `PersistenceService`, so they land in order.
    private static func saveFx(_ library: Library, _ env: AppEnvironment) -> Fx<AppAction> {
        Future<AppAction, Never> { promise in
            // Enqueued synchronously here (in `update`), so writes land in the order sent.
            // Future's promise is thread-safe; Combine just doesn't annotate it Sendable.
            nonisolated(unsafe) let promise = promise
            env.persistence.enqueueWrite(library) { result in
                switch result {
                case .success:
                    promise(.success(.saveStatus(.saved)))
                case .failure(let error):
                    logger.error("auto-save failed: \(error.localizedDescription, privacy: .public)")
                    promise(.success(.saveStatus(.error)))
                }
            }
        }.eraseToAnyPublisher()
    }
}
