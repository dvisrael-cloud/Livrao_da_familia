# Copilot Instructions for *Livrão da Família* (Web App)

This is a small React + Vite project whose purpose is to collect and store family history data.
Use these notes to guide any AI agents working in the repository.

---

## 🧠 Big‑picture architecture

1. **Frontend only** – no backend code lives here. Data is written/read directly from Firebase.
2. **Entry point** is `src/main.jsx` which renders `<App />` from `src/App.jsx`.
3. **Feature‑based layout** under `src/features/{Auth,Hub,Form,Gallery,Upload,Recipes,Account,Welcome}`.
   Components and logic related to a domain live together.
4. **Shared components** in `src/components`; generic UI elements in `src/components/common/UI.jsx`.
5. **Services** (`src/services/*.js`) encapsulate Firebase calls. `api.js` is a barrel re‑exporting them.
   - `authService.js`, `familyService.js`, `profileService.js`, `storageService.js` all talk to Firestore/Auth/Storage.
6. **State flow** is mostly prop‑drilling; `App.jsx` holds `userSession`, `formData` and passes handlers down.
7. **Firestore data model**:
   - Root collection `familias` with a document per user (uid) containing representative info.
   - Sub‑collection `membros` inside each user doc; each member is keyed by its `role`/`papel`.
   - `INITIAL_STATE` (67 fields) defines the canonical shape for every record. See `src/constants/initial_state.js`.
8. **Dynamic form engine**: the entire questionnaire is driven by `src/constants/formConfig.js`.
   - Each item has properties like `order`, `wizardSection`, `component`, `fieldId`, `conditionalRule` etc.
   - `FormEngine.jsx` groups items into steps, evaluates visibility rules, and renders a switch on `component`.
   - Add a new field by updating both `formConfig` and `INITIAL_STATE`; adjust visibility logic if needed.
9. **Navigation** between login/register/form/hub/etc. is controlled by `<App />`’s `view` state.


## 🛠️ Developer workflows

```bash
npm install          # install deps
npm run dev          # start Vite dev server (localhost:3002)
npm run build        # production build
npm run preview      # run build locally
npm run lint         # ESLint
```

- There are **no automated tests**; avoid inventing test folders unless adding them consciously.
- Firebase configuration is hard‑coded in `src/services/firebase.js`. Replace with your own keys or use `import.meta.env` if you prefer.
- `VITE_GOOGLE_MAPS_API_KEY` is used in `AutoLocationSelector.jsx` for address autocomplete.
- Deployments are done via `firebase deploy` (not included here); inspect `firebase.json` for hosting rules.


## 🧩 Conventions & patterns

- **Tailwind CSS** classes throughout; prefer utility classes, rarely custom styles.
- **Functional components** only; use React hooks (`useState`, `useEffect`, `useCallback`, `useMemo`).
- **Props vs. state**:
  - Forms live in `App.jsx` as `formData`. Components update via passed `setFormData` or `updateFormData` callbacks.
  - Progress calculation is defined twice (in `App.jsx` and `FormEngine.jsx`) using a weight table.
- **Icons** from `lucide-react`; import individual icons where needed.
- **File uploads** are handled by `UploadWidget` and `useUploadManager`. The latter returns `processUploads` which cleans files and returns URLs.
- **Literals** are mostly in Portuguese – don’t translate interface text unless the task specifically requires.
- **Logging style**: `console.log(..., result)`, `console.error(...)` with contextual messages. Many debug statements remain in services.
- **Error handling**: services return objects `{ status: 'success'|'error', message?, data? }` – follow same shape when adding new APIs.


## 📎 Integration points and extensions

- **Add a Firebase rule**: modify `storage.rules`/`firebase.json` accordingly; reflect the structure in services.
- **Google Places**: `react-google-places-autocomplete` is used; see `AutoLocationSelector.jsx` for usage and example of reading `import.meta.env`.
- **Phone input** uses `react-phone-input-2` with default country `br`.
- **Form conditional rules** are evaluated by `evaluateConditionalRule` (search for its implementation in `FormEngine.jsx`).
- **Family tree UI**: `FamilyTreeSelector.jsx` shows a tree and fires callbacks when a role is selected or deleted.


## 📝 What to document in PRs

- Any change to `formConfig.js` must also mention: "added/modified X field in questionnaire; added default in `INITIAL_STATE`".
- When altering Firestore schema, note the collection/document/subcollection affected and migrate existing data if necessary.
- Keep `docs/` up‑to‑date for screen flows and UI anatomy; automated script isn’t available.


> **Note to copilot/AI agents:**
> 1. Avoid generic suggestions like “write tests.” Focus on existing patterns.
> 2. When editing large generated files (e.g. `formConfig.js`), be respectful of the manual ordering and comment style already present.
> 3. If you’re uncertain about the business meaning of a field, look at `docs/` or ask the human.

---

Feel free to ask the maintainer for clarification when the instructions here are insufficient or outdated.

