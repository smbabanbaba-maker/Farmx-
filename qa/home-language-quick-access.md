# Home localization and Quick Access QA

## Browser verification

- Home preview loaded at `http://localhost:3001/`.
- Home showed the localized search title and subtitle, weather status area, marketplace title `Products in Kano`, dynamic subtitle `Products from 37 states across Nigeria`, product See all, jobs, community, and the unchanged seven-item bottom navigation.
- Default Quick Access showed one horizontal row with Market, Jobs, Learn, and Analytics plus a See all control. Wallet was not shown by default.
- Settings preview loaded at `http://localhost:3001/settings`.
- Settings currently exposes the `Change language` control and the existing five-language selector path.

## Build checks at this checkpoint

- `pnpm lint`: passed with existing warning-only Fast Refresh and hook-dependency warnings; no errors after formatting.
- `pnpm typecheck`: passed.
- `pnpm build`: passed.
- `pnpm translation:check`: passed with 0 missing keys; fallback diagnostics remain for non-Home dictionary keys.

## Language selector verification

The Settings language selector exposed English, Hausa, Igbo, Yorùbá, and Kanuri. Selecting Hausa updated the Settings title, profile labels, navigation labels, language control, and several preference labels without a refresh. The browser also exposed remaining legacy hardcoded labels such as `Edit profile`, `Notification centre`, `Channels & push alerts`, `Enable notifications`, `Buyer protection`, `Cognito account`, and `Share feedback` in Settings; these are outside the Home route and should be moved into the centralized dictionary before claiming full no-mixed-language completion.
