# Dashboard, Weather, and Notifications QA

The production dashboard was checked after the latest build. The balance card is absent. The quick-access area starts as one row with Market, Wallet, Jobs, and Learn, plus a See all control for the remaining shortcuts.

The dashboard displays 30 agricultural product cards and both See all links route to `/market`. The state selector is available at the top of the page and is populated from the full Nigeria state and FCT list. The live weather request completed successfully for Kano and returned 28°C, Thunderstorms, 73% humidity, and UV 8 during verification.

The notification indicator changed from a permanent dot to an unread-count badge. A weather update notification was created through the existing notification store, and the header displayed one unread notification. The dashboard remains responsive in the production browser viewport.

The state selector was opened and verified to list all 36 states plus FCT Abuja. Selecting Ogun persisted the selection, promoted the Ogun cassava listing to the first card, refreshed the live weather to 26°C, Partly cloudy, 81% humidity, and UV 7, and raised the header notification count to two. This confirms state-driven content ordering, real weather updates, and notifications work together.

The dashboard’s See all products control was clicked and correctly navigated to `/market`, where all 30 listings are available.
