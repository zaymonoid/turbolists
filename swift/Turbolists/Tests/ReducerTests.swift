import Foundation
import Testing
import TurbolistsCore
@testable import Turbolists

private let item: ItemId = "charger"
private let kit: KitId = "essentials"
private let trip: TripId = "coast"

private func initial() -> AppModel {
    var m = AppModel()
    m.view = .items
    m.selectedTripId = trip
    m.selectedKitId = kit
    m.loadStatus = .ready
    m.persistence = .saved
    m.undo = nil
    m.data = Library(
        items: [Item(id: item, name: "Charger")],
        kits: [Kit(id: kit, name: "Essentials", itemIds: [item])],
        trips: [Trip(id: trip, name: "Coast", createdAt: "2026-11-10", kitIds: [kit], checked: [item])]
    )
    return m
}

private let env = AppEnvironment(persistence: PersistenceService(url: FileManager.default.temporaryDirectory.appendingPathComponent("reducer-unused.json")))

private func reduce(_ state: AppModel, _ action: AppAction) -> AppModel {
    AppModel.update(state: state, action: action, environment: env).state
}

@Suite struct ReducerTests {
    @Test func startIsIgnoredOnceLoadedAndShowsLoadingOnRetry() {
        var edited = initial()
        edited.data.items.append(Item(id: "unsaved", name: "Unsaved"))
        #expect(reduce(edited, .start) == edited)
        var failed = initial()
        failed.loadStatus = .error
        #expect(reduce(failed, .start).loadStatus == .loading)
    }

    @Test func undoRestoresItemKitReferencesAndCheckedProgress() {
        let original = initial()
        let deleted = reduce(original, .deleteItem(id: item))
        #expect(deleted.data.items == [])
        #expect(deleted.data.kits[0].itemIds == [])
        #expect(deleted.data.trips[0].checked.isEmpty)
        let restored = reduce(deleted, .undo)
        #expect(restored.data == original.data)
        #expect(restored.undo == nil)
        #expect(reduce(restored, .undo).data == restored.data)
        #expect(reduce(restored, .undo).undo == restored.undo)
    }

    @Test func undoSurvivesTabChangesAndSaveAcknowledgements() {
        var state = reduce(initial(), .deleteKit(id: kit))
        state = reduce(state, .setView(.trips))
        state = reduce(state, .saveStatus(.saved))
        #expect(state.undo != nil)
        let restored = reduce(state, .undo)
        #expect(restored.data == initial().data)
        #expect(restored.view == .trips)
    }

    @Test func editingInvalidatesUndo() {
        var state = reduce(initial(), .deleteTrip(id: trip))
        state = reduce(state, .renameItem(id: item, name: "USB charger"))
        #expect(state.undo == nil)
        #expect(reduce(state, .undo).data.items[0].name == "USB charger")
        #expect(reduce(state, .undo).data.trips.count == 0)
    }

    @Test func secondDestructiveEditReplacesPreviousUndo() {
        var state = reduce(initial(), .deleteItem(id: item))
        state = reduce(state, .deleteTrip(id: trip))
        let restored = reduce(state, .undo)
        #expect(restored.data.trips.count == 1)
        #expect(restored.data.items.count == 0)
    }

    @Test func resetAndItemRemovalCanBeUndoneDismissalAndReloadClearRecovery() {
        let actions: [AppAction] = [
            .resetChecks(tripId: trip),
            .removeItemFromKit(kitId: kit, itemId: item),
        ]
        for action in actions {
            let state = reduce(initial(), action)
            #expect(state.undo != nil)
            #expect(reduce(state, .undo).data == initial().data)
            #expect(reduce(state, .dismissUndo).undo == nil)
            #expect(reduce(state, .loaded(initial().data)).undo == nil)
        }
        #expect(AppAction.undo.isDataAction)
    }

    @Test func archivingIsReversibleWithoutLosingCheckedProgress() {
        let before = initial()
        let after = reduce(before, .setTripArchived(id: trip, archived: true))
        #expect(after.data.trips[0].archived == true)
        #expect(after.data.trips[0].checked == before.data.trips[0].checked)
        #expect(reduce(after, .undo).data == before.data)
    }

    @Test func deletingOpenKitReturnsToKitListOtherKitsStayOpen() {
        let before = initial()
        let other: KitId = "beach"
        let opened = reduce(before, .selectKit(other))
        #expect(opened.selectedKitId == other)
        #expect(reduce(opened, .deleteKit(id: kit)).selectedKitId == other)
        #expect(reduce(before, .deleteKit(id: kit)).selectedKitId == nil)
    }

    @Test func failedInvariantLeavesStateUnchanged() {
        let before = initial()
        let after = reduce(before, .renameItem(id: "missing", name: "x"))
        #expect(after == before)
    }
}
