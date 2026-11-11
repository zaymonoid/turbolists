import SwiftUI

/// A single-field prompt (create / rename) presented as a native alert with a text field.
struct TextPrompt: Identifiable {
    let id = UUID()
    var title: String
    var message: String? = nil
    var placeholder: String = "Name"
    var initial: String = ""
    var confirm: String = "Save"
    /// Called with the trimmed, non-empty value.
    var onSubmit: (String) -> Void
}

extension View {
    /// Presents `prompt` as an alert with a text field; clears it when dismissed.
    func textPrompt(_ prompt: Binding<TextPrompt?>) -> some View {
        modifier(TextPromptModifier(prompt: prompt))
    }
}

private struct TextPromptModifier: ViewModifier {
    @Binding var prompt: TextPrompt?
    @State private var text = ""
    /// The alert's title/actions are kept while it animates out.
    @State private var shown: TextPrompt?

    func body(content: Content) -> some View {
        content
            .alert(
                shown?.title ?? "",
                isPresented: Binding(get: { prompt != nil }, set: { if !$0 { prompt = nil } }),
                presenting: shown
            ) { p in
                TextField(p.placeholder, text: $text.capped)
                    .textInputAutocapitalization(.sentences)
                Button("Cancel", role: .cancel) {}
                Button(p.confirm) {
                    let value = text.trimmed
                    if !value.isEmpty { p.onSubmit(value) }
                }
                .disabled(text.trimmed.isEmpty)
                .keyboardShortcut(.defaultAction)
            } message: { p in
                if let message = p.message { Text(message) }
            }
            .onChange(of: prompt?.id, initial: true) {
                if let prompt {
                    text = prompt.initial
                    shown = prompt
                }
            }
    }
}
