# FarmX App Audit — Abin da ya Rage, a Ƙara, ko a Cire

## Taƙaitaccen hukunci

FarmX yanzu yana da **kyakkyawan frontend marketplace**: dashboard, Market mai products 30, cikakken product detail, live chat, Settings, subscriptions, buyer protection screens, notifications, da white/red FarmX branding suna nan. An kuma tabbatar da TypeScript, lint, da production build suna wucewa.

Amma kafin a kira shi cikakken **real production app**, babban aikin da ya rage shi ne haɗa UI ɗin da **real backend services**. A yanzu, yawancin bayanai kamar products, wallet balance, orders, profile metrics, jobs, community posts, da transactions suna fitowa daga local state ko sample data. Wannan ya dace da demo da preview, amma ba zai isa app mai amfani na gaske ba.

> **Babban shawara:** Kada a ƙara features masu yawa yanzu. A fara da haɗa abubuwan da suka riga suka kasance da AWS, Cognito, da Paystack domin Market, payment, user account, da orders su zama na gaske.

| Matsayi              | Hukunci                                                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Frontend / UI**    | Ya yi kyau kuma yana kusa da production quality.                                                                               |
| **Marketplace flow** | Ya yi aiki a UI, amma products, photos, availability, da sellers suna buƙatar DynamoDB API.                                    |
| **Live chat**        | Yana aiki a browser/local tabs, amma ba ainihin multi-user server chat ba ne tukuna.                                           |
| **Payments**         | Paystack flow yana da client stub; sai AWS API da server-side verification kafin a karɓi real kuɗi.                            |
| **Accounts**         | Settings da profile suna adanawa a browser; Cognito login, sign-up, reset password, da roles ba su haɗu da frontend ba tukuna. |
| **Deployment**       | Build ɗin Vercel yana wucewa; sai a sa production environment variables da AWS endpoint.                                       |

---

## Abubuwan da suka riga suka yi kyau

| Feature                                             | Halin da yake ciki                                                                                                        |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| FarmX branding, white/red design, mobile navigation | **An gama**                                                                                                               |
| Dashboard da Open-Meteo weather                     | **Yana amfani da real public weather API**                                                                                |
| Duk states 36 da FCT Abuja                          | **An gama**                                                                                                               |
| Market da products 30                               | **UI yana aiki; danna product yana kaiwa detail page**                                                                    |
| Product detail                                      | **Gallery UI, seller feedback, buyer protection, secure payment CTA, delivery, save/follow/report, similar ads suna nan** |
| Live chat                                           | **Typing, auto-reply demo, read receipts, anti-fraud scan, unread inbox suna nan**                                        |
| Settings                                            | **Preferences suna ajiye a device kuma suna shafar chat/calls/feedback**                                                  |
| Subscription                                        | **Free quota 5, tier list, installments, subscription CTA suna nan**                                                      |
| Promotion                                           | **TOP promo flow yana nan; babu listing fee**                                                                             |
| AWS infrastructure document                         | **S3, DynamoDB, Cognito, Secrets Manager, IAM template yana nan**                                                         |
| Post product UI                                     | **Validation, photo selection, da S3-upload-ready flow suna nan**                                                         |

---

# 1. Abin da ya rage sosai — a yi shi kafin real launch

## 1.1 Haɗa DynamoDB da Market data

Yanzu Market, dashboard products, product detail, saved ads, mini-store, da profile metrics suna dogaro ne da sample data. A gina API na AWS domin:

- ƙirƙirar listing, gyara, rufe, delete, da republish;
- ɗauko listings ta state, category, seller, price, da search keyword;
- ɗauko product detail ɗaya ta ID;
- ajiye stock/availability, condition, delivery option, description, promotion status, da seller ID;
- ajiye saved ads, followed sellers, views, da report status a database;
- kada user ya iya canza ko delete listing da ba tasa ba.

**Sakamako:** kaya da mai sayarwa ya saka zai bayyana ga kowa, ba a browser ɗinsa kawai ba.

## 1.2 Haɗa AWS Cognito da real user account

A yi cikakken account flow: sign-up, sign-in, email/phone verification, forgot password, reset password, logout, da account deletion request. A yi roles guda uku:

| Role                | Abin da zai iya yi                                                              |
| ------------------- | ------------------------------------------------------------------------------- |
| **Buyer**           | Browse, chat, save, order, pay escrow, review after order.                      |
| **Seller / Farmer** | Post/modify products, manage inventory, receive orders, buy promo/subscription. |
| **Admin / Support** | Review KYC, reports, disputes, listings, promotions, da user safety.            |

Settings page yanzu ta bayyana yadda password reset zai yi aiki, amma a haɗa ta da Cognito hosted flow ko custom auth screen kafin public launch.

## 1.3 Real Paystack payment da server-side verification

Kada a karɓi real kuɗi idan backend verification bai cika ba. A AWS API a samar da:

1. `POST /payments/init` domin fara Paystack transaction.
2. `POST /payments/verify` domin tabbatar da reference daga server-side.
3. Paystack webhook handler domin biyan da ya faru ko user ya rufe browser.
4. Idempotency check domin kada a credit sau biyu.
5. DynamoDB payment ledger domin a iya audit.

Payment types da ya dace FarmX ya riƙe su ne **subscription**, **TOP promotion**, da **buyer-protection escrow**. Wannan ya bi dokar app cewa **babu listing fee**.

## 1.4 Real product photo management

Yanzu wasu product pages suna nuna emoji/gallery na demo. A real launch:

- a yi private S3 upload da presigned URL;
- a yi virus/file validation, maximum size, da image optimization;
- a ajiye object keys a DynamoDB listing record;
- a nuna real uploaded photos kawai;
- idan seller bai sa hoto ba, kar a nuna “4 photos” na ƙarya;
- a kara image moderation kafin listing ya bayyana.

## 1.5 Real chat service

Chat ɗin yanzu yana da kyau sosai ga demo: local persistence, BroadcastChannel, typing, auto-reply, da receipts. Amma buyer daga wani phone ba zai yi chat da seller na gaske ba tukuna.

A production a yi:

- Conversation da Message tables a DynamoDB;
- API/WebSocket ko managed realtime provider;
- Cognito user ID a kowane message;
- unread counter, delivery/seen receipt, message report, block user, da rate-limit;
- secure file attachment a S3;
- moderation queue ga fraud links, scam keywords, da reported messages;
- babu auto-reply sai idan seller ya kunna a matsayin business auto-response.

## 1.6 Orders, escrow, delivery, da disputes

Buyer protection UI tana nan, amma flow ɗin zai zama real ne idan akwai:

- order state machine: `created → payment pending → funded → seller accepted → shipped → delivered → confirmed / disputed / refunded`;
- payment/escrow transaction tied to order ID;
- seller acceptance da buyer delivery confirmation;
- evidence upload na dispute zuwa S3;
- admin dispute review page mai audit trail;
- refund rules da support escalation.

---

# 2. Abubuwan da ya dace a ƙara bayan core backend

## 2.1 Search da filters na manyan marketplace

Market search yanzu yana filter sample products a browser. Bayan DynamoDB API, a ƙara:

- search by product name, category, state, LGA, seller, price range, condition, da delivery type;
- sorting: newest, lowest price, highest rating, nearest location, promoted;
- category page mai SEO-friendly URL;
- pagination / infinite scroll;
- “recent searches” da saved search alert.

## 2.2 Seller verification mai matakai

A ware **subscription** daga **verification** domin kada user ya rikice. Subscription na nufin more listings/visibility; verification na nufin KYC trust.

Verification ya kamata ya ƙunshi:

- phone OTP;
- email OTP;
- National ID/BVN/CAC business proof bisa tsarin doka da za a amince da shi;
- review status: pending, approved, rejected;
- verified badge kawai bayan admin/automation ya amince.

## 2.3 Delivery module

A ƙara delivery coordinator mai sauƙi kafin a gina fleet mai nauyi:

- seller ya zaɓi pickup, local delivery, courier, ko farm delivery;
- buyer ya saka delivery address bayan order;
- delivery fee quote;
- courier assignment/tracking reference;
- timeline na delivery updates;
- proof of delivery photo/code.

## 2.4 Seller dashboard mai real numbers

Profile metrics kamar ads, followers, ratings, balance, da performance kada su kasance static. A lissafo su daga DynamoDB:

- active / sold / expired listings;
- listing views da unique viewers;
- chat inquiries;
- conversion to order;
- completed order sales;
- subscription/promo history;
- real rating bayan completed order kawai.

## 2.5 Review system mai aminci

A halin yanzu feedback a product detail sample ne. A canza zuwa:

- buyer mai completed order kawai zai iya review;
- rating 1–5 tare da optional photo;
- seller reply;
- report abusive review;
- average rating da review count daga real data.

## 2.6 Notifications masu real event

A ƙara event-based notifications ga:

- new chat;
- new order;
- payment verified;
- escrow funded / delivery update / confirmation;
- dispute update;
- subscription installment due;
- promo zai ƙare;
- listing ya ƙare ko admin ya yi reject.

A yi browser push kawai idan user ya bayar da permission; a ƙara email/SMS fallback ga abubuwa masu muhimmanci.

## 2.7 Trust & safety

Wannan yana da muhimmanci ga marketplace:

- user block/mute;
- report listing, seller, buyer, da message;
- rate limit na posts, chats, da OTP;
- prohibited-item policy;
- admin moderation queue;
- fraud flags da audit log;
- clear safety pages da customer support ticket system.

## 2.8 PWA, offline, da low-data mode

Domin wasu users suna amfani da weak network:

- installable PWA;
- cache last opened listings da chats;
- compressed images da lazy loading;
- retry queue ga photo upload;
- Hausa da English su zama cikakke a kowane screen.

---

# 3. Abubuwan da ya kamata a cire, a ɓoye, ko a gyara

## 3.1 Wallet mai static — a gyara ko a ɓoye

Wallet page tana nuna fixed balance da fixed transactions. Idan ba za a gina **real regulated wallet ledger** yanzu ba, a ɓoye Wallet daga main navigation ko a mayar da shi zuwa **Payments & receipts** kawai.

> **Shawara:** A farko, a yi Paystack checkout + payment receipts. Kada a nuna “wallet balance” na ƙarya har sai akwai real accounting, withdrawal rules, reconciliation, da security review.

## 3.2 Profile menu mai duplicate/wrong destinations — a gyara

A profile, wasu menu suna kaiwa generic routes maimakon real dedicated screen.

| Current item                         | Matsala                            | Gyaran da ya dace                                             |
| ------------------------------------ | ---------------------------------- | ------------------------------------------------------------- |
| My ads → Market                      | Ba ya nuna listings na owner kawai | Ƙirƙiri `/my-ads` mai drafts, active, sold, expired.          |
| My clients → Messages                | Sunan bai dace ba                  | A kira shi **Customer chats**, ko a gina actual customer CRM. |
| Feedback → Community                 | Ba seller feedback page ba ne      | A kai zuwa Reviews & ratings page.                            |
| Request help → Messages              | Ba support system ba ne            | A kai zuwa Help centre / support tickets.                     |
| Balance → Wallet static              | Bai da real ledger                 | A ɓoye ko a mayar da Payments & receipts.                     |
| Followers static                     | Lamba ba ta real                   | A lissafo daga database ko a ɓoye metric.                     |
| My ads / rating / performance static | Misleading                         | A maye gurbinsu da real metrics kawai.                        |

## 3.3 Badge tiers biyu masu rikitarwa — a daidaita

Akwai FarmX subscription plans (Basic zuwa Enterprise Lux) da kuma company badge tiers (Bluetek, Gold, Platinum). Idan dukansu za su kasance, a bayyana banbancinsu sosai:

- **Subscription:** listing quota, promotion tools, business features;
- **Verification badge:** trust/KYC status, ba saye kawai ba.

Idan ba za a gina two systems da kyau ba, a cire company badge tier na biyu don kada user ya rikice.

## 3.4 Fake phone call da generic seller details — a gyara

A product detail, call seller yana amfani da generic number. Kafin real seller contacts:

- a sa verified contact number daga profile;
- ko a ɓoye direct call kuma a bar “Request callback” cikin secure chat;
- kar a nuna seller location/years/replies figures idan ba daga database suke ba.

## 3.5 Fake gallery, fair-price estimate, reviews, da “listed today” — a gyara

Wadannan suna ƙara kyau ga demo, amma kada su zama misleading a real launch.

- “4 photos” ya zama real photo count;
- price guide ya fito daga actual comparable listings ko a rubuta **Estimated market range**;
- reviews su fito daga completed orders;
- listed date ya fito daga `createdAt`;
- availability da condition su fito daga seller listing record.

## 3.6 Feature breadth mai yawa — a ɓoye daga main navigation har sai core ya yi real

Jobs, Learn, Community, Fleet, Staff, Inventory, da mini-company website suna da amfani a gaba. Amma ga first launch, su na iya rage focus daga core flow:

> **Browse product → contact seller → pay securely → delivery → confirm / dispute → review.**

A bar routes dinsu idan ana son a ci gaba da gini, amma kada su samu babban matsayi a main navigation ko dashboard sai an samu real data, moderation, da clear business owner.

---

# 4. Tsarin aiki bisa muhimmanci

| Phase                        | Aiki                                                                                                                               | Dalilin fifiko                                                         |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **P0 — kafin public launch** | Cognito auth, real DynamoDB listings, S3 images, Paystack verification/webhook, orders/escrow, real chat service, admin moderation | Waɗannan su ne ginshiƙin trust, money, da multi-user marketplace.      |
| **P1 — bayan P0**            | Delivery flow, reviews after order, real seller dashboard, search/sort/pagination, notifications, support tickets                  | Suna ƙara conversion, trust, da customer support.                      |
| **P2 — growth**              | PWA, Hausa/English full localization, promo analytics, referral, saved-search alerts, seller mini-store                            | Suna ƙara growth da retention.                                         |
| **P3 — optional expansion**  | Jobs, Learn, Community, Fleet, Staff, advanced inventory                                                                           | A yi su ne bayan core marketplace ya fara samun users da transactions. |

---

# 5. Abin da nake ba da shawarar a fara yanzu

A fara da wannan sprint guda ɗaya:

1. **Cognito sign-up/sign-in/forgot-password da buyer/seller roles.**
2. **DynamoDB real product CRUD + Market API + product detail API.**
3. **S3 real image upload + ajiye photo keys a listing.**
4. **Paystack server verification da payment ledger; subscription da TOP promo su zama real.**
5. **Cire static wallet/balance daga navigation har sai ledger ya zama real.**
6. **`My ads`, `Reviews`, da `Help` su samu own pages maimakon redirect zuwa unrelated pages.**

Wannan zai maida FarmX daga app mai kyau na demo zuwa **marketplace mai gaskiya da zai iya karɓar users**.

---

## Shawarar ƙarshe

**Kada a gina manyan sabbin screens yanzu.** A kulle data, auth, payments, orders, da messaging na gaskiya farko. Bayan an gama, sai a inganta logistics, analytics, da community.

Idan kana so, mataki na gaba shi ne na fara **P0 backend integration** a tsari: Cognito → DynamoDB listings → S3 photos → Paystack verification.
