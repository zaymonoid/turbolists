import OSLog
import SwiftUI
import UIKit

private let logger = Logger(subsystem: "com.kitbag.swiftui", category: "prompt")

/// A single-field prompt (create / rename) presented as a native alert with a text field.
struct TextPrompt: Identifiable {
    let id = UUID()
    var title: String
    var message: String? = nil
    var placeholder: String = "Name"
    var initial: String = ""
    var confirm: String = "Save"
    /// Called with the trimmed, capped, non-empty value once the alert has finished
    /// leaving, so it may navigate or present straight away.
    var onSubmit: (String) -> Void
}

extension View {
    /// Presents `prompt` as an alert with a text field; clears it when the alert closes.
    func textPrompt(_ prompt: Binding<TextPrompt?>) -> some View {
        background { TextPromptPresenter(prompt: prompt) }
    }
}

/// Presents the prompt as a `UIAlertController`.
///
/// SwiftUI's `.alert` says nothing when it finishes leaving, and a `NavigationStack`
/// push made during that exit is silently dropped. UIKit's dismissal has a real end,
/// and `onSubmit` runs after it. Presenting through UIKit also keeps the screen's
/// `.tint` off the alert, which turned the filled confirm button's label blue on blue.
private struct TextPromptPresenter: UIViewControllerRepresentable {
    @Binding var prompt: TextPrompt?

    func makeUIViewController(context: Context) -> UIViewController {
        let host = UIViewController()
        host.view.isHidden = true
        return host
    }

    func updateUIViewController(_ host: UIViewController, context: Context) {
        context.coordinator.onClose = { prompt = nil }
        context.coordinator.sync(prompt, from: host)
    }

    static func dismantleUIViewController(_ host: UIViewController, coordinator: Coordinator) {
        coordinator.alert?.dismiss(animated: false)
    }

    func makeCoordinator() -> Coordinator { Coordinator() }

    @MainActor
    final class Coordinator {
        private(set) var alert: UIAlertController?
        /// The last prompt presented. Kept after it closes: SwiftUI can call
        /// `updateUIViewController` again before `prompt = nil` arrives, and the same
        /// prompt must not be presented twice.
        private var presentedId: UUID?
        var onClose: () -> Void = {}

        func sync(_ prompt: TextPrompt?, from host: UIViewController) {
            if let prompt, prompt.id != presentedId {
                present(prompt, from: host)
            } else if prompt == nil, let alert {
                // Cleared from outside: close without submitting.
                self.alert = nil
                alert.dismiss(animated: true)
            }
        }

        private func present(_ prompt: TextPrompt, from host: UIViewController) {
            let alert = UIAlertController(title: prompt.title, message: prompt.message, preferredStyle: .alert)
            alert.addTextField { field in
                field.placeholder = prompt.placeholder
                field.text = prompt.initial.capped
                field.autocapitalizationType = .sentences
                field.clearButtonMode = .whileEditing
                field.accessibilityLabel = prompt.title
                field.addAction(UIAction { [weak field] _ in
                    // Leave text alone while an IME is composing; capping mid-composition breaks it.
                    guard let field, field.markedTextRange == nil, let text = field.text else { return }
                    if text.count > String.nameLimit { field.text = text.capped }
                }, for: .editingChanged)
            }
            alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { [weak self, weak alert] _ in
                self?.close(after: alert?.presentingViewController) {}
            })
            let confirm = UIAlertAction(title: prompt.confirm, style: .default) { [weak self, weak alert] _ in
                let value = (alert?.textFields?.first?.text ?? "").trimmed.capped
                self?.close(after: alert?.presentingViewController) {
                    // Empty submits are ignored (alerts never refreshed a `.disabled` button as you typed).
                    if !value.isEmpty { prompt.onSubmit(value) }
                }
            }
            alert.addAction(confirm)
            alert.preferredAction = confirm

            presentedId = prompt.id
            host.present(alert, animated: true)
            guard alert.presentingViewController != nil else {
                // UIKit refused (e.g. something else is mid-presentation). Clear the prompt
                // so the caller can ask again instead of waiting on an alert that never shows.
                logger.error("Prompt “\(prompt.title, privacy: .public)” was not presented: host is busy presenting")
                onClose()
                return
            }
            self.alert = alert
        }

        /// From the alert's action handlers. Clears the prompt, then runs `then` once
        /// `presenter`'s transition (the alert leaving) has completed. UIKit usually runs
        /// the handlers after the alert has gone, in which case `then` runs straight away.
        private func close(after presenter: UIViewController?, then: @escaping () -> Void) {
            alert = nil
            onClose()
            if let transition = presenter?.transitionCoordinator {
                transition.animate(alongsideTransition: nil) { _ in then() }
            } else {
                then()
            }
        }
    }
}
