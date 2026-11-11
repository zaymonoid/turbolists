import Foundation
import KitbagCore

enum AppView: String, Equatable, Sendable { case trips, kits, items }
enum LoadStatus: Equatable, Sendable { case loading, ready, error }
enum PersistenceStatus: Equatable, Sendable { case saved, error }

/// One-for-one with the TS `AppAction` union.
enum AppAction: Equatable, Sendable {
    // Items
    case createItem(id: ItemId, name: String)
    case renameItem(id: ItemId, name: String)
    case deleteItem(id: ItemId)
    // Kits
    case createKit(id: KitId, name: String)
    case renameKit(id: KitId, name: String)
    case deleteKit(id: KitId)
    case addItemToKit(kitId: KitId, itemId: ItemId)
    case removeItemFromKit(kitId: KitId, itemId: ItemId)
    case moveItemInKit(kitId: KitId, itemId: ItemId, toIndex: Int)
    // Trips
    case createTrip(id: TripId, name: String, createdAt: String)
    case duplicateTrip(sourceId: TripId, id: TripId, name: String, createdAt: String)
    case renameTrip(id: TripId, name: String)
    case deleteTrip(id: TripId)
    case addKitToTrip(tripId: TripId, kitId: KitId)
    case removeKitFromTrip(tripId: TripId, kitId: KitId)
    case toggleChecked(tripId: TripId, itemId: ItemId)
    case resetChecks(tripId: TripId)
    case setTripArchived(id: TripId, archived: Bool)
    // Navigation
    case setView(AppView)
    case selectTrip(TripId?)
    case selectKit(KitId?)
    // Recovery
    case undo
    case dismissUndo
    // Persistence
    case start                      // kick off loading (call once at launch)
    case loaded(Library)
    case loadFailed
    case saveStatus(PersistenceStatus)
    case retrySave
    case flushSave                  // write now (scene went to background)
    case saveDue(generation: Int)   // internal: debounce timer fired
}

extension AppAction {
    /// Actions that mutate persisted data (TS `dataActionIds`).
    var isDataAction: Bool {
        switch self {
        case .undo, .createItem, .renameItem, .deleteItem,
             .createKit, .renameKit, .deleteKit, .addItemToKit, .removeItemFromKit, .moveItemInKit,
             .createTrip, .setTripArchived, .duplicateTrip, .renameTrip, .deleteTrip,
             .addKitToTrip, .removeKitFromTrip, .toggleChecked, .resetChecks:
            return true
        default:
            return false
        }
    }

    /// Undo banner message for destructive actions (TS `undoMessages`).
    var undoMessage: String? {
        switch self {
        case .deleteItem: "Item deleted"
        case .deleteKit: "Kit deleted"
        case .deleteTrip: "Trip deleted"
        case .removeItemFromKit: "Item removed from kit"
        case .resetChecks: "Packing progress reset"
        case .setTripArchived(_, let archived): archived ? "Trip archived" : "Trip restored"
        default: nil
        }
    }
}
