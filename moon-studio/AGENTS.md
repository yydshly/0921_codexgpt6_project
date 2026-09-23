# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## Product direction confirmed 2026-09-22

The user rejected image-plus-music effects as the product's main value. Prioritize an understandable creation and participation loop: initiate a Mid-Autumn letter, write personal memory and an original opening line, invite another person, receive their continuation, and preserve a jointly authored result. Poetry and documented cultural context must inform the activity. Keep all three selected visual styles as expression choices, not the top-level product purpose. Clearly label local demonstrations and file-based exchange; never claim a cloud invitation was sent. Retain the existing studio as an optional inspiration canvas. Do not require the user to select the three visual styles again.

## Latest user correction — emotional experience, 2026-09-22

The user also rejected the shared-letter iteration: it still feels like pictures and sound, does not feel interesting, and does not move them emotionally. The earlier letter-first direction is therefore not an accepted final product direction. Do not treat passing visual checks or a functional form/reply loop as validation of product value. Before expanding pages or templates, establish and demonstrate a short core interaction with anticipation, meaningful control, and a perceptible surprise or emotional turn. The participant must have a reason to act before being asked to provide personal writing. Preserve the existing prototypes as experiments; do not keep polishing the letter concept as if this feedback approved it. A clarification on the intended emotion is pending in the conversation.

## User-selected direction — interactive pictures, 2026-09-22

The user now explicitly proposes image-based interaction, optionally combined with voice, music, and classical poetry. Treat the picture as an explorable surface with meaningful object/region actions and user-authored extensions. Start from the existing selected moonlit image and typography; do not ask for visual-style selection again. Demonstrate actual interaction before asking users to fill forms. Support local image/audio input and authoring of interaction points; be accurate about manual placement versus automated image understanding, browser narration versus recorded voice, and local persistence versus online sharing.

## Further user feedback — hotspot editor is insufficient, 2026-09-22

The user considers the current picture-plus-click-configuration prototype too limited and of little value, and asks how to proceed. Do not treat the current interactive picture editor as an accepted final product or further expand fixed moon/boat effects as proof of value. The next proposal must explain the intended finished creation and how creators can meaningfully change it. Automated image understanding is an optional creation aid, not an established user requirement or proof of value. A broader layer/event/state/action editor and complete media preservation are proposed directions, not yet user-confirmed implementation scope.

## Accepted continuation — interactive story authoring, 2026-09-22

The user replied “继续” to the proposed complete short story and open layer/event/state/action authoring direction. Implement 《给团圆留一盏灯》 with connected gestures and an editable second poetry example using the same engine. Preserve uploaded images/audio and complete portable playback/editor files. The old hotspot editor remains an experiment. Do not equate functional completion with validated emotional or commercial value. Standalone HTML is a file handoff, not a published public link.
