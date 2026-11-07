"""Deterministic replies for every (state, action), in en, sr (Latin; Cyrillic by transliteration), es, de, pt, ru.

Used when no LLM is configured, when the LLM fails, or when its reply fails validation twice. Only FactSheet fields are
interpolated; each sentence has variants and the first variant whose placeholders are all present is used, so a missing
fact drops a detail instead of breaking the reply. fr / it (and anything else) fall back to English.

Composition: [contradiction (if EXPLAIN_STATUS.claim_contradicted)] + [status (if EXPLAIN_STATUS or no actions)] +
one sentence per remaining action, in the order policy decided them. MANAGE_SUBSCRIPTION_LINK is folded into
CANCEL_STEPS when both are present (the cancel sentence already carries the link).
"""
from __future__ import annotations

import re
import string
from typing import Any, Iterable

TEMPLATE_LANGS = ("en", "sr", "es", "de", "pt", "ru")

V = list[str]

# =====================================================================================================================
# English
# =====================================================================================================================
EN = {
    "ack": {"charged_after_cancel": ["You're right: you turned off renewal on {cancelled_on}, and a charge still went through on {last_charged_on}.", "You're right: a charge went through after you turned off renewal."]},
    "status": {
        "ACTIVE_RENEWING": [
            "Your {product_name} subscription ({store_name}) is active and renews on {renews_on} for {price}.",
            "Your {product_name} subscription ({store_name}) is active and renews on {renews_on}.",
            "Your {product_name} subscription is active and renews automatically.",
            "Your subscription is active and renews automatically.",
        ],
        "CANCELLED_PAID_UP": [
            "Your {product_name} subscription is cancelled, so it won't renew. You keep full access until {expires_on}.",
            "Your {product_name} subscription is cancelled, so it won't renew.",
            "Your subscription is cancelled, so it won't renew.",
        ],
        "TRIAL_ACTIVE": [
            "You're on the free trial of {product_name}. On {trial_ends_on} it becomes a paid subscription at {price} unless you cancel before then.",
            "You're on the free trial of {product_name}. On {trial_ends_on} it becomes a paid subscription unless you cancel before then.",
            "You're on the free trial of {product_name}; it becomes a paid subscription unless you cancel it.",
            "You're on a free trial; it becomes a paid subscription unless you cancel it.",
        ],
        "TRIAL_CANCELLED": [
            "Your free trial of {product_name} is cancelled, so you won't be charged. You can keep using it until {trial_ends_on}.",
            "Your free trial of {product_name} is cancelled, so you won't be charged. You can keep using it until {expires_on}.",
            "Your free trial of {product_name} is cancelled, so you won't be charged.",
            "Your free trial is cancelled, so you won't be charged.",
        ],
        "GRACE_PERIOD": [
            "{store_name} couldn't take the payment for {product_name} (first failed on {billing_issue_on}). You keep access while it retries, until {grace_ends_on}.",
            "{store_name} couldn't take the payment for {product_name}. You keep access for now while it retries.",
            "The store couldn't take your last payment. You keep access for now while it retries.",
        ],
        "BILLING_RETRY": [
            "{store_name} couldn't take the renewal payment for {product_name} (since {billing_issue_on}), so premium is paused while the store keeps retrying.",
            "{store_name} couldn't take the renewal payment for {product_name}, so premium is paused while the store keeps retrying.",
            "The store couldn't take your renewal payment, so premium is paused while it keeps retrying.",
        ],
        "EXPIRED_BILLING_ERROR": [
            "Your {product_name} subscription ended on {expires_on} because {store_name} couldn't take the renewal payment.",
            "Your {product_name} subscription ended because the store couldn't take the renewal payment.",
            "Your subscription ended because the store couldn't take the renewal payment.",
        ],
        "EXPIRED_CANCELLED": [
            "Your {product_name} subscription was cancelled and ended on {expires_on}, so it's no longer active and won't renew.",
            "Your {product_name} subscription was cancelled and has ended, so it won't renew.",
            "Your subscription was cancelled and has ended, so it won't renew.",
        ],
        "REFUNDED": [
            "Your {product_name} purchase was refunded on {refunded_on}, so that subscription is no longer active.",
            "Your {product_name} purchase was refunded, so that subscription is no longer active.",
            "This purchase was refunded, so the subscription is no longer active.",
        ],
        "LIFETIME": [
            "You have lifetime access to {product_name}: it's a one-time purchase, so there's nothing to renew and no further charges.",
            "You have lifetime access: it's a one-time purchase, so there's nothing to renew and no further charges.",
        ],
        "GRANTED_BY_DEVELOPER": [
            "Your {product_name} access is a gift from the app team and lasts until {granted_until}. It isn't a paid subscription, so nothing will be charged.",
            "Your {product_name} access is a gift from the app team and lasts until {expires_on}. It isn't a paid subscription, so nothing will be charged.",
            "Your access is a gift from the app team. It isn't a paid subscription, so nothing will be charged.",
        ],
        "NO_PURCHASE": [
            "I can't find a purchase on this account. If you paid with a different Apple ID or Google account, the purchase is linked to that account.",
        ],
        "FAMILY_SHARED": [
            "Your {product_name} access comes through Family Sharing, so the subscription and its billing belong to the family organizer's account, not yours.",
            "Your access comes through Family Sharing, so the subscription and its billing belong to the family organizer's account, not yours.",
        ],
    },
    "contra": {
        "not_cancelled": ["I don't see a cancellation on this subscription. It's still set to renew."],
        "nothing_charged": ["Nothing has been charged for this. You're on the free trial."],
        "renewal_charge_failed": ["The renewal payment didn't go through, so you weren't charged for a new period."],
        "already_refunded": ["This purchase has already been refunded."],
        "one_time_purchase": ["Lifetime access is a one-time purchase, so there are no recurring charges."],
        "no_charge_on_account": ["I don't see any subscription charge on this account."],
        "organizer_pays": ["Family Sharing charges go to the family organizer, not to your account."],
        "refund_ended_access": ["Access ended because the purchase was refunded."],
        "period_ended": ["Your paid period has ended, which is why premium is locked now."],
        "no_purchase_on_account": ["I don't see a purchase on this account yet."],
        "organizer_must_request": ["Only the family organizer, who paid, can ask the store for a refund."],
        "payment_ok": ["There's no payment problem on your subscription right now."],
        "has_access": ["Your account does have premium access right now."],
        "claim_does_not_match": ["What I see on your account is a little different."],
        "charged_before_cancel": [
            "The last charge was on {last_charged_on} and you turned off renewal on {cancelled_on}, after that charge. So nothing was charged after you cancelled.",
            "The last charge happened before you cancelled, so nothing was charged after you cancelled.",
        ],
        "no_cancellation_recorded": ["I can't see any charge after your cancellation on this account."],
    },
    "action": {
        "MANAGE_SUBSCRIPTION_LINK": ["Your subscription page is {manage_url}. You can see and change it there.",
                                     "You can manage your subscription in your store account's subscription settings."],
        "CANCEL_STEPS:app_store": [
            "To cancel: open Settings on your iPhone, tap your name, then Subscriptions, choose {product_name} and tap Cancel Subscription ({manage_url}).",
            "To cancel: open Settings on your iPhone, tap your name, then Subscriptions, choose the subscription and tap Cancel Subscription.",
        ],
        "CANCEL_STEPS:play_store": [
            "To cancel: open Google Play, tap your profile icon, then Payments & subscriptions > Subscriptions, choose {product_name} and tap Cancel subscription ({manage_url}).",
            "To cancel: open Google Play, tap your profile icon, then Payments & subscriptions > Subscriptions, choose the subscription and tap Cancel subscription.",
        ],
        "CANCEL_STEPS": ["To cancel, turn off renewal on the subscriptions page of the store where you subscribed."],
        "REFUND_PATH_APPLE": [
            "Refunds for App Store purchases are decided by Apple, not by us. You can request one at {refund_url}.",
            "Refunds for App Store purchases are decided by Apple, not by us. You can request one at reportaproblem.apple.com.",
        ],
        "REFUND_PATH_GOOGLE": [
            "You can request a refund through Google Play at {refund_url}; Google reviews the request.",
            "You can request a refund through Google Play's order history; Google reviews the request.",
        ],
        "RESTORE_PURCHASES_STEPS:app_store": ["On your new device, sign in with the same Apple ID you bought with, open the app and tap Restore Purchases in its settings."],
        "RESTORE_PURCHASES_STEPS:play_store": ["On your new device, sign in with the same Google account you bought with, open the app and tap Restore Purchases in its settings."],
        "RESTORE_PURCHASES_STEPS": ["Sign in with the same store account you bought with, open the app and tap Restore Purchases in its settings."],
        "UPDATE_PAYMENT_METHOD:app_store": [
            "Please update your payment method in your Apple account: {payment_url} (or Settings > your name > Payment & Shipping). The store will then retry the payment.",
            "Please update your payment method in Settings > your name > Payment & Shipping. The store will then retry the payment.",
        ],
        "UPDATE_PAYMENT_METHOD:play_store": [
            "Please update your payment method in Google Play: {payment_url}. The store will then retry the payment.",
            "Please update your payment method in Google Play > Payments & subscriptions. The store will then retry the payment.",
        ],
        "UPDATE_PAYMENT_METHOD": ["Please update your payment method in the store where you subscribed."],
        "PROPOSE_GRANT": [
            "I've asked the team to review a {grant_days}-day courtesy extension of your access. It isn't active yet and only starts if they approve it.",
            "I've asked the team to review a short courtesy extension of your access. It isn't active yet and only starts if they approve it.",
        ],
        "ESCALATE_TO_HUMAN": ["I've passed this to our support team, and a person will get back to you here."],
        "ESCALATE_TO_HUMAN:no_store": ["This purchase isn't managed through the App Store or Google Play, so I've passed it to our support team. A person will get back to you here."],
    },
}

# =====================================================================================================================
# Serbian (Latin; sr-Cyrl is produced by transliteration)
# =====================================================================================================================
SR = {
    "ack": {"charged_after_cancel": ["U pravu ste: obnovu ste isključili {cancelled_on}, a naplata je ipak prošla {last_charged_on}.", "U pravu ste: naplata je prošla nakon što ste isključili obnovu."]},
    "status": {
        "ACTIVE_RENEWING": [
            "Vaša pretplata {product_name} ({store_name}) je aktivna i obnavlja se {renews_on} po ceni od {price}.",
            "Vaša pretplata {product_name} ({store_name}) je aktivna i obnavlja se {renews_on}.",
            "Vaša pretplata {product_name} je aktivna i automatski se obnavlja.",
            "Vaša pretplata je aktivna i automatski se obnavlja.",
        ],
        "CANCELLED_PAID_UP": [
            "Vaša pretplata {product_name} je otkazana i neće se obnoviti. Pun pristup imate do {expires_on}.",
            "Vaša pretplata {product_name} je otkazana i neće se obnoviti.",
            "Vaša pretplata je otkazana i neće se obnoviti.",
        ],
        "TRIAL_ACTIVE": [
            "Koristite besplatni probni period za {product_name}. Ako ga ne otkažete ranije, {trial_ends_on} prelazi u plaćenu pretplatu po ceni od {price}.",
            "Koristite besplatni probni period za {product_name}. Ako ga ne otkažete ranije, {trial_ends_on} prelazi u plaćenu pretplatu.",
            "Koristite besplatni probni period za {product_name}; ako ga ne otkažete, prelazi u plaćenu pretplatu.",
            "Koristite besplatni probni period; ako ga ne otkažete, prelazi u plaćenu pretplatu.",
        ],
        "TRIAL_CANCELLED": [
            "Vaš besplatni probni period za {product_name} je otkazan, tako da vam ništa neće biti naplaćeno. Možete ga koristiti do {trial_ends_on}.",
            "Vaš besplatni probni period za {product_name} je otkazan, tako da vam ništa neće biti naplaćeno. Možete ga koristiti do {expires_on}.",
            "Vaš besplatni probni period za {product_name} je otkazan, tako da vam ništa neće biti naplaćeno.",
            "Vaš besplatni probni period je otkazan, tako da vam ništa neće biti naplaćeno.",
        ],
        "GRACE_PERIOD": [
            "{store_name} nije uspeo da naplati {product_name} (prvi neuspeli pokušaj {billing_issue_on}). Pristup imate dok se naplata ponovo pokušava, do {grace_ends_on}.",
            "{store_name} nije uspeo da naplati {product_name}. Pristup za sada imate dok se naplata ponovo pokušava.",
            "Prodavnica nije uspela da naplati poslednju uplatu. Pristup za sada imate dok se naplata ponovo pokušava.",
        ],
        "BILLING_RETRY": [
            "{store_name} nije uspeo da naplati obnovu za {product_name} (od {billing_issue_on}), pa je premium pauziran dok prodavnica ponovo pokušava naplatu.",
            "{store_name} nije uspeo da naplati obnovu za {product_name}, pa je premium pauziran dok prodavnica ponovo pokušava naplatu.",
            "Prodavnica nije uspela da naplati obnovu, pa je premium pauziran dok ponovo pokušava naplatu.",
        ],
        "EXPIRED_BILLING_ERROR": [
            "Vaša pretplata {product_name} je istekla {expires_on} jer {store_name} nije uspeo da naplati obnovu.",
            "Vaša pretplata {product_name} je istekla jer prodavnica nije uspela da naplati obnovu.",
            "Vaša pretplata je istekla jer prodavnica nije uspela da naplati obnovu.",
        ],
        "EXPIRED_CANCELLED": [
            "Vaša pretplata {product_name} je otkazana i istekla je {expires_on}, tako da više nije aktivna i neće se obnavljati.",
            "Vaša pretplata {product_name} je otkazana i istekla je, tako da se neće obnavljati.",
            "Vaša pretplata je otkazana i istekla je, tako da se neće obnavljati.",
        ],
        "REFUNDED": [
            "Za kupovinu {product_name} novac je vraćen {refunded_on}, pa ta pretplata više nije aktivna.",
            "Za kupovinu {product_name} novac je vraćen, pa ta pretplata više nije aktivna.",
            "Za ovu kupovinu novac je vraćen, pa pretplata više nije aktivna.",
        ],
        "LIFETIME": [
            "Imate doživotni pristup za {product_name}: to je jednokratna kupovina, pa nema obnavljanja ni daljih naplata.",
            "Imate doživotni pristup: to je jednokratna kupovina, pa nema obnavljanja ni daljih naplata.",
        ],
        "GRANTED_BY_DEVELOPER": [
            "Vaš pristup za {product_name} je poklon tima aplikacije i važi do {granted_until}. To nije plaćena pretplata, pa vam ništa neće biti naplaćeno.",
            "Vaš pristup za {product_name} je poklon tima aplikacije i važi do {expires_on}. To nije plaćena pretplata, pa vam ništa neće biti naplaćeno.",
            "Vaš pristup je poklon tima aplikacije. To nije plaćena pretplata, pa vam ništa neće biti naplaćeno.",
        ],
        "NO_PURCHASE": [
            "Na ovom nalogu ne vidim nijednu kupovinu. Ako ste platili drugim Apple ID-jem ili Google nalogom, kupovina je vezana za taj nalog.",
        ],
        "FAMILY_SHARED": [
            "Vaš pristup za {product_name} dolazi preko Porodičnog deljenja, pa pretplata i naplata pripadaju nalogu organizatora porodice, a ne vašem.",
            "Vaš pristup dolazi preko Porodičnog deljenja, pa pretplata i naplata pripadaju nalogu organizatora porodice, a ne vašem.",
        ],
    },
    "contra": {
        "not_cancelled": ["Ne vidim da je ova pretplata otkazana. I dalje je podešena da se obnavlja."],
        "nothing_charged": ["Za ovo vam ništa nije naplaćeno jer koristite besplatni probni period."],
        "renewal_charge_failed": ["Naplata obnove nije prošla, pa vam novi period nije naplaćen."],
        "already_refunded": ["Za ovu kupovinu novac je već vraćen."],
        "one_time_purchase": ["Doživotni pristup je jednokratna kupovina, pa nema ponavljajućih naplata."],
        "no_charge_on_account": ["Na ovom nalogu ne vidim nijednu naplatu pretplate."],
        "organizer_pays": ["Naplate za Porodično deljenje idu organizatoru porodice, a ne vašem nalogu."],
        "refund_ended_access": ["Pristup je prestao jer je za kupovinu vraćen novac."],
        "period_ended": ["Plaćeni period je istekao i zato je premium sada zaključan."],
        "no_purchase_on_account": ["Na ovom nalogu još ne vidim kupovinu."],
        "organizer_must_request": ["Povraćaj novca od prodavnice može da zatraži samo organizator porodice, koji je i platio."],
        "payment_ok": ["Trenutno nema problema sa plaćanjem vaše pretplate."],
        "has_access": ["Vaš nalog trenutno ima premium pristup."],
        "claim_does_not_match": ["Na vašem nalogu vidim malo drugačije stanje."],
        "charged_before_cancel": [
            "Poslednja naplata je bila {last_charged_on}, a obnovu ste isključili {cancelled_on}, posle te naplate. Dakle, posle otkazivanja ništa nije naplaćeno.",
            "Poslednja naplata je bila pre vašeg otkazivanja, tako da posle otkazivanja ništa nije naplaćeno.",
        ],
        "no_cancellation_recorded": ["Na ovom nalogu ne vidim naplatu posle vašeg otkazivanja."],
    },
    "action": {
        "MANAGE_SUBSCRIPTION_LINK": ["Stranica vaše pretplate je {manage_url}. Tamo je možete pogledati i menjati.",
                                     "Pretplatu možete menjati u podešavanjima pretplata na nalogu prodavnice."],
        "CANCEL_STEPS:app_store": [
            "Da otkažete: otvorite Podešavanja na iPhone-u, dodirnite svoje ime, zatim Pretplate, izaberite {product_name} i dodirnite Otkaži pretplatu ({manage_url}).",
            "Da otkažete: otvorite Podešavanja na iPhone-u, dodirnite svoje ime, zatim Pretplate, izaberite pretplatu i dodirnite Otkaži pretplatu.",
        ],
        "CANCEL_STEPS:play_store": [
            "Da otkažete: otvorite Google Play, dodirnite ikonicu profila, zatim Plaćanja i pretplate > Pretplate, izaberite {product_name} i dodirnite Otkaži pretplatu ({manage_url}).",
            "Da otkažete: otvorite Google Play, dodirnite ikonicu profila, zatim Plaćanja i pretplate > Pretplate, izaberite pretplatu i dodirnite Otkaži pretplatu.",
        ],
        "CANCEL_STEPS": ["Da otkažete, isključite obnavljanje na stranici pretplata u prodavnici u kojoj ste se pretplatili."],
        "REFUND_PATH_APPLE": [
            "O povraćaju novca za kupovine u App Store-u odlučuje Apple, a ne mi. Zahtev možete poslati na {refund_url}.",
            "O povraćaju novca za kupovine u App Store-u odlučuje Apple, a ne mi. Zahtev možete poslati na reportaproblem.apple.com.",
        ],
        "REFUND_PATH_GOOGLE": [
            "Povraćaj novca možete zatražiti preko Google Play-a na {refund_url}; Google razmatra zahtev.",
            "Povraćaj novca možete zatražiti u istoriji porudžbina na Google Play-u; Google razmatra zahtev.",
        ],
        "RESTORE_PURCHASES_STEPS:app_store": ["Na novom uređaju se prijavite istim Apple ID-jem kojim ste kupili, otvorite aplikaciju i u njenim podešavanjima dodirnite Vrati kupovine."],
        "RESTORE_PURCHASES_STEPS:play_store": ["Na novom uređaju se prijavite istim Google nalogom kojim ste kupili, otvorite aplikaciju i u njenim podešavanjima dodirnite Vrati kupovine."],
        "RESTORE_PURCHASES_STEPS": ["Prijavite se istim nalogom prodavnice kojim ste kupili, otvorite aplikaciju i u njenim podešavanjima dodirnite Vrati kupovine."],
        "UPDATE_PAYMENT_METHOD:app_store": [
            "Ažurirajte način plaćanja na svom Apple nalogu: {payment_url} (ili Podešavanja > vaše ime > Plaćanje i isporuka). Prodavnica će zatim ponovo pokušati naplatu.",
            "Ažurirajte način plaćanja u Podešavanja > vaše ime > Plaćanje i isporuka. Prodavnica će zatim ponovo pokušati naplatu.",
        ],
        "UPDATE_PAYMENT_METHOD:play_store": [
            "Ažurirajte način plaćanja na Google Play-u: {payment_url}. Prodavnica će zatim ponovo pokušati naplatu.",
            "Ažurirajte način plaćanja u Google Play > Plaćanja i pretplate. Prodavnica će zatim ponovo pokušati naplatu.",
        ],
        "UPDATE_PAYMENT_METHOD": ["Ažurirajte način plaćanja u prodavnici u kojoj ste se pretplatili."],
        "PROPOSE_GRANT": [
            "Poslali smo timu zahtev da razmotri produženje vašeg pristupa za {grant_days} dana, kao gest dobre volje. Još nije aktivno i počinje samo ako ga odobre.",
            "Poslali smo timu zahtev da razmotri kratko produženje vašeg pristupa, kao gest dobre volje. Još nije aktivno i počinje samo ako ga odobre.",
        ],
        "ESCALATE_TO_HUMAN": ["Prosledili smo vaš slučaj našem timu podrške i neko od njih će vam odgovoriti ovde."],
        "ESCALATE_TO_HUMAN:no_store": ["Ova kupovina nije preko App Store-a ni Google Play-a, pa smo vaš slučaj prosledili našem timu podrške. Neko od njih će vam odgovoriti ovde."],
    },
}

# =====================================================================================================================
# Spanish
# =====================================================================================================================
ES = {
    "ack": {"charged_after_cancel": ["Tienes razón: desactivaste la renovación el {cancelled_on} y aun así hubo un cobro el {last_charged_on}.", "Tienes razón: hubo un cobro después de que desactivaras la renovación."]},
    "status": {
        "ACTIVE_RENEWING": [
            "Tu suscripción {product_name} ({store_name}) está activa y se renueva el {renews_on} por {price}.",
            "Tu suscripción {product_name} ({store_name}) está activa y se renueva el {renews_on}.",
            "Tu suscripción {product_name} está activa y se renueva automáticamente.",
            "Tu suscripción está activa y se renueva automáticamente.",
        ],
        "CANCELLED_PAID_UP": [
            "Tu suscripción {product_name} está cancelada y no se renovará; mantienes el acceso completo hasta el {expires_on}.",
            "Tu suscripción {product_name} está cancelada y no se renovará.",
            "Tu suscripción está cancelada y no se renovará.",
        ],
        "TRIAL_ACTIVE": [
            "Estás en la prueba gratuita de {product_name}. El {trial_ends_on} pasará a ser una suscripción de pago por {price}, salvo que la canceles antes.",
            "Estás en la prueba gratuita de {product_name}. El {trial_ends_on} pasará a ser una suscripción de pago, salvo que la canceles antes.",
            "Estás en la prueba gratuita de {product_name}; si no la cancelas, pasará a ser de pago.",
            "Estás en una prueba gratuita; si no la cancelas, pasará a ser de pago.",
        ],
        "TRIAL_CANCELLED": [
            "Tu prueba gratuita de {product_name} está cancelada, así que no se te cobrará nada. Puedes seguir usándola hasta el {trial_ends_on}.",
            "Tu prueba gratuita de {product_name} está cancelada, así que no se te cobrará nada. Puedes seguir usándola hasta el {expires_on}.",
            "Tu prueba gratuita de {product_name} está cancelada, así que no se te cobrará nada.",
            "Tu prueba gratuita está cancelada, así que no se te cobrará nada.",
        ],
        "GRACE_PERIOD": [
            "{store_name} no pudo cobrar {product_name} (primer intento fallido el {billing_issue_on}). Mantienes el acceso mientras reintenta el cobro, hasta el {grace_ends_on}.",
            "{store_name} no pudo cobrar {product_name}. Por ahora mantienes el acceso mientras reintenta el cobro.",
            "La tienda no pudo cobrar tu último pago. Por ahora mantienes el acceso mientras reintenta el cobro.",
        ],
        "BILLING_RETRY": [
            "{store_name} no pudo cobrar la renovación de {product_name} (desde el {billing_issue_on}), así que premium está en pausa mientras la tienda reintenta el cobro.",
            "{store_name} no pudo cobrar la renovación de {product_name}, así que premium está en pausa mientras la tienda reintenta el cobro.",
            "La tienda no pudo cobrar la renovación, así que premium está en pausa mientras reintenta el cobro.",
        ],
        "EXPIRED_BILLING_ERROR": [
            "Tu suscripción {product_name} terminó el {expires_on} porque {store_name} no pudo cobrar la renovación.",
            "Tu suscripción {product_name} terminó porque la tienda no pudo cobrar la renovación.",
            "Tu suscripción terminó porque la tienda no pudo cobrar la renovación.",
        ],
        "EXPIRED_CANCELLED": [
            "Tu suscripción {product_name} se canceló y terminó el {expires_on}; ya no está activa y no se renovará.",
            "Tu suscripción {product_name} se canceló y ya terminó, así que no se renovará.",
            "Tu suscripción se canceló y ya terminó, así que no se renovará.",
        ],
        "REFUNDED": [
            "La compra de {product_name} se reembolsó el {refunded_on}, por eso esa suscripción ya no está activa.",
            "La compra de {product_name} se reembolsó, por eso esa suscripción ya no está activa.",
            "Esta compra se reembolsó, por eso la suscripción ya no está activa.",
        ],
        "LIFETIME": [
            "Tienes acceso de por vida a {product_name}: es una compra única, así que no hay renovaciones ni más cobros.",
            "Tienes acceso de por vida: es una compra única, así que no hay renovaciones ni más cobros.",
        ],
        "GRANTED_BY_DEVELOPER": [
            "Tu acceso a {product_name} es un regalo del equipo de la app y dura hasta el {granted_until}. No es una suscripción de pago, así que no se te cobrará nada.",
            "Tu acceso a {product_name} es un regalo del equipo de la app y dura hasta el {expires_on}. No es una suscripción de pago, así que no se te cobrará nada.",
            "Tu acceso es un regalo del equipo de la app. No es una suscripción de pago, así que no se te cobrará nada.",
        ],
        "NO_PURCHASE": [
            "No encuentro ninguna compra en esta cuenta. Si pagaste con otro Apple ID u otra cuenta de Google, la compra está vinculada a esa cuenta.",
        ],
        "FAMILY_SHARED": [
            "Tu acceso a {product_name} llega a través de En familia, así que la suscripción y su cobro pertenecen a la cuenta del organizador familiar, no a la tuya.",
            "Tu acceso llega a través de En familia, así que la suscripción y su cobro pertenecen a la cuenta del organizador familiar, no a la tuya.",
        ],
    },
    "contra": {
        "not_cancelled": ["No veo ninguna cancelación en esta suscripción: sigue configurada para renovarse."],
        "nothing_charged": ["No se te ha cobrado nada por esto: estás en la prueba gratuita."],
        "renewal_charge_failed": ["El cobro de la renovación no se completó, así que no se te cobró un nuevo periodo."],
        "already_refunded": ["Esta compra ya está reembolsada."],
        "one_time_purchase": ["El acceso de por vida es una compra única, sin cobros recurrentes."],
        "no_charge_on_account": ["No veo ningún cobro de suscripción en esta cuenta."],
        "organizer_pays": ["Los cobros de En familia van a la cuenta del organizador familiar, no a la tuya."],
        "refund_ended_access": ["El acceso terminó porque la compra se reembolsó."],
        "period_ended": ["Tu periodo pagado terminó; por eso premium está bloqueado ahora."],
        "no_purchase_on_account": ["Todavía no veo ninguna compra en esta cuenta."],
        "organizer_must_request": ["Solo el organizador familiar, que fue quien pagó, puede pedir un reembolso a la tienda."],
        "payment_ok": ["Ahora mismo no hay ningún problema de pago en tu suscripción."],
        "has_access": ["Tu cuenta tiene acceso premium ahora mismo."],
        "claim_does_not_match": ["Lo que veo en tu cuenta es un poco distinto."],
        "charged_before_cancel": [
            "El último cobro fue el {last_charged_on} y desactivaste la renovación el {cancelled_on}, después de ese cobro; así que no hubo ningún cobro tras la cancelación.",
            "El último cobro fue antes de que cancelaras; después de la cancelación no hubo ningún cobro.",
        ],
        "no_cancellation_recorded": ["No veo ningún cobro posterior a tu cancelación en esta cuenta."],
    },
    "action": {
        "MANAGE_SUBSCRIPTION_LINK": ["La página de tu suscripción es {manage_url}: ahí puedes verla y cambiarla.",
                                     "Puedes gestionar tu suscripción en los ajustes de suscripciones de tu cuenta de la tienda."],
        "CANCEL_STEPS:app_store": [
            "Para cancelar: abre Ajustes en tu iPhone, toca tu nombre, luego Suscripciones, elige {product_name} y toca Cancelar suscripción ({manage_url}).",
            "Para cancelar: abre Ajustes en tu iPhone, toca tu nombre, luego Suscripciones, elige la suscripción y toca Cancelar suscripción.",
        ],
        "CANCEL_STEPS:play_store": [
            "Para cancelar: abre Google Play, toca tu foto de perfil, luego Pagos y suscripciones > Suscripciones, elige {product_name} y toca Cancelar suscripción ({manage_url}).",
            "Para cancelar: abre Google Play, toca tu foto de perfil, luego Pagos y suscripciones > Suscripciones, elige la suscripción y toca Cancelar suscripción.",
        ],
        "CANCEL_STEPS": ["Para cancelar, desactiva la renovación en la página de suscripciones de la tienda donde te suscribiste."],
        "REFUND_PATH_APPLE": [
            "Los reembolsos de compras del App Store los decide Apple, no nosotros; puedes solicitarlo en {refund_url}.",
            "Los reembolsos de compras del App Store los decide Apple, no nosotros; puedes solicitarlo en reportaproblem.apple.com.",
        ],
        "REFUND_PATH_GOOGLE": [
            "Puedes solicitar un reembolso a través de Google Play en {refund_url}; Google revisa la solicitud.",
            "Puedes solicitar un reembolso desde el historial de pedidos de Google Play; Google revisa la solicitud.",
        ],
        "RESTORE_PURCHASES_STEPS:app_store": ["En tu nuevo dispositivo, inicia sesión con el mismo Apple ID con el que compraste, abre la app y toca Restaurar compras en sus ajustes."],
        "RESTORE_PURCHASES_STEPS:play_store": ["En tu nuevo dispositivo, inicia sesión con la misma cuenta de Google con la que compraste, abre la app y toca Restaurar compras en sus ajustes."],
        "RESTORE_PURCHASES_STEPS": ["Inicia sesión con la misma cuenta de la tienda con la que compraste, abre la app y toca Restaurar compras en sus ajustes."],
        "UPDATE_PAYMENT_METHOD:app_store": [
            "Actualiza tu método de pago en tu cuenta de Apple: {payment_url} (o Ajustes > tu nombre > Pago y envío). Después, la tienda volverá a intentar el cobro.",
            "Actualiza tu método de pago en Ajustes > tu nombre > Pago y envío. Después, la tienda volverá a intentar el cobro.",
        ],
        "UPDATE_PAYMENT_METHOD:play_store": [
            "Actualiza tu método de pago en Google Play: {payment_url}. Después, la tienda volverá a intentar el cobro.",
            "Actualiza tu método de pago en Google Play > Pagos y suscripciones. Después, la tienda volverá a intentar el cobro.",
        ],
        "UPDATE_PAYMENT_METHOD": ["Actualiza tu método de pago en la tienda donde te suscribiste."],
        "PROPOSE_GRANT": [
            "He pedido al equipo que revise una extensión de cortesía de {grant_days} días para tu acceso. Aún no está activa: solo empieza si la aprueban.",
            "He pedido al equipo que revise una breve extensión de cortesía para tu acceso. Aún no está activa: solo empieza si la aprueban.",
        ],
        "ESCALATE_TO_HUMAN": ["He pasado tu caso a nuestro equipo de soporte y una persona te responderá aquí."],
        "ESCALATE_TO_HUMAN:no_store": ["Esta compra no se hizo por el App Store ni Google Play, así que he pasado tu caso a nuestro equipo de soporte; una persona te responderá aquí."],
    },
}

# =====================================================================================================================
# German
# =====================================================================================================================
DE = {
    "ack": {"charged_after_cancel": ["Sie haben recht: Sie haben die Verlängerung am {cancelled_on} ausgeschaltet, und am {last_charged_on} wurde trotzdem abgebucht.", "Sie haben recht: Nach dem Ausschalten der Verlängerung wurde trotzdem abgebucht."]},
    "status": {
        "ACTIVE_RENEWING": [
            "Ihr Abo {product_name} ({store_name}) ist aktiv und verlängert sich am {renews_on} für {price}.",
            "Ihr Abo {product_name} ({store_name}) ist aktiv und verlängert sich am {renews_on}.",
            "Ihr Abo {product_name} ist aktiv und verlängert sich automatisch.",
            "Ihr Abo ist aktiv und verlängert sich automatisch.",
        ],
        "CANCELLED_PAID_UP": [
            "Ihr Abo {product_name} ist gekündigt und verlängert sich nicht. Sie haben vollen Zugang bis zum {expires_on}.",
            "Ihr Abo {product_name} ist gekündigt und verlängert sich nicht.",
            "Ihr Abo ist gekündigt und verlängert sich nicht.",
        ],
        "TRIAL_ACTIVE": [
            "Sie nutzen gerade die kostenlose Testphase von {product_name}. Am {trial_ends_on} wird daraus ein bezahltes Abo für {price}, wenn Sie nicht vorher kündigen.",
            "Sie nutzen gerade die kostenlose Testphase von {product_name}. Am {trial_ends_on} wird daraus ein bezahltes Abo, wenn Sie nicht vorher kündigen.",
            "Sie nutzen gerade die kostenlose Testphase von {product_name}; ohne Kündigung wird daraus ein bezahltes Abo.",
            "Sie nutzen gerade eine kostenlose Testphase; ohne Kündigung wird daraus ein bezahltes Abo.",
        ],
        "TRIAL_CANCELLED": [
            "Ihre kostenlose Testphase von {product_name} ist gekündigt, Ihnen wird also nichts berechnet. Sie können sie bis zum {trial_ends_on} weiter nutzen.",
            "Ihre kostenlose Testphase von {product_name} ist gekündigt, Ihnen wird also nichts berechnet. Sie können sie bis zum {expires_on} weiter nutzen.",
            "Ihre kostenlose Testphase von {product_name} ist gekündigt, Ihnen wird also nichts berechnet.",
            "Ihre kostenlose Testphase ist gekündigt, Ihnen wird also nichts berechnet.",
        ],
        "GRACE_PERIOD": [
            "{store_name} konnte die Zahlung für {product_name} nicht einziehen (erster Fehlversuch am {billing_issue_on}). Solange es erneut versucht wird, behalten Sie den Zugang bis zum {grace_ends_on}.",
            "{store_name} konnte die Zahlung für {product_name} nicht einziehen. Solange es erneut versucht wird, behalten Sie vorerst den Zugang.",
            "Der Store konnte Ihre letzte Zahlung nicht einziehen. Solange es erneut versucht wird, behalten Sie vorerst den Zugang.",
        ],
        "BILLING_RETRY": [
            "{store_name} konnte die Verlängerung von {product_name} nicht abbuchen (seit {billing_issue_on}), daher ist Premium pausiert, während der Store es erneut versucht.",
            "{store_name} konnte die Verlängerung von {product_name} nicht abbuchen, daher ist Premium pausiert, während der Store es erneut versucht.",
            "Der Store konnte die Verlängerung nicht abbuchen, daher ist Premium pausiert, während er es erneut versucht.",
        ],
        "EXPIRED_BILLING_ERROR": [
            "Ihr Abo {product_name} ist am {expires_on} abgelaufen, weil {store_name} die Verlängerung nicht abbuchen konnte.",
            "Ihr Abo {product_name} ist abgelaufen, weil der Store die Verlängerung nicht abbuchen konnte.",
            "Ihr Abo ist abgelaufen, weil der Store die Verlängerung nicht abbuchen konnte.",
        ],
        "EXPIRED_CANCELLED": [
            "Ihr Abo {product_name} wurde gekündigt und ist am {expires_on} abgelaufen. Es ist nicht mehr aktiv und verlängert sich nicht.",
            "Ihr Abo {product_name} wurde gekündigt und ist abgelaufen, es verlängert sich also nicht.",
            "Ihr Abo wurde gekündigt und ist abgelaufen, es verlängert sich also nicht.",
        ],
        "REFUNDED": [
            "Der Kauf von {product_name} wurde am {refunded_on} erstattet, deshalb ist dieses Abo nicht mehr aktiv.",
            "Der Kauf von {product_name} wurde erstattet, deshalb ist dieses Abo nicht mehr aktiv.",
            "Dieser Kauf wurde erstattet, deshalb ist das Abo nicht mehr aktiv.",
        ],
        "LIFETIME": [
            "Sie haben lebenslangen Zugang zu {product_name}: Es ist ein Einmalkauf, also gibt es keine Verlängerung und keine weiteren Abbuchungen.",
            "Sie haben lebenslangen Zugang: Es ist ein Einmalkauf, also gibt es keine Verlängerung und keine weiteren Abbuchungen.",
        ],
        "GRANTED_BY_DEVELOPER": [
            "Ihr Zugang zu {product_name} ist ein Geschenk des App-Teams und gilt bis zum {granted_until}. Es ist kein bezahltes Abo, Ihnen wird also nichts berechnet.",
            "Ihr Zugang zu {product_name} ist ein Geschenk des App-Teams und gilt bis zum {expires_on}. Es ist kein bezahltes Abo, Ihnen wird also nichts berechnet.",
            "Ihr Zugang ist ein Geschenk des App-Teams. Es ist kein bezahltes Abo, Ihnen wird also nichts berechnet.",
        ],
        "NO_PURCHASE": [
            "Ich finde auf diesem Konto keinen Kauf. Wenn Sie mit einer anderen Apple-ID oder einem anderen Google-Konto bezahlt haben, ist der Kauf mit diesem Konto verknüpft.",
        ],
        "FAMILY_SHARED": [
            "Ihr Zugang zu {product_name} kommt über die Familienfreigabe. Abo und Abrechnung gehören zum Konto des Familienorganisators, nicht zu Ihrem.",
            "Ihr Zugang kommt über die Familienfreigabe. Abo und Abrechnung gehören zum Konto des Familienorganisators, nicht zu Ihrem.",
        ],
    },
    "contra": {
        "not_cancelled": ["Ich sehe keine Kündigung für dieses Abo. Es ist weiterhin auf Verlängerung eingestellt."],
        "nothing_charged": ["Dafür wurde Ihnen nichts berechnet, da Sie in der kostenlosen Testphase sind."],
        "renewal_charge_failed": ["Die Abbuchung für die Verlängerung ist fehlgeschlagen, ein neuer Zeitraum wurde Ihnen also nicht berechnet."],
        "already_refunded": ["Dieser Kauf wurde bereits erstattet."],
        "one_time_purchase": ["Lebenslanger Zugang ist ein Einmalkauf, es gibt keine wiederkehrenden Abbuchungen."],
        "no_charge_on_account": ["Ich sehe auf diesem Konto keine Abo-Abbuchung."],
        "organizer_pays": ["Abbuchungen der Familienfreigabe gehen an den Familienorganisator, nicht an Ihr Konto."],
        "refund_ended_access": ["Der Zugang ist beendet, weil der Kauf erstattet wurde."],
        "period_ended": ["Ihr bezahlter Zeitraum ist abgelaufen, deshalb ist Premium jetzt gesperrt."],
        "no_purchase_on_account": ["Ich sehe auf diesem Konto noch keinen Kauf."],
        "organizer_must_request": ["Nur der Familienorganisator, der bezahlt hat, kann beim Store eine Erstattung anfragen."],
        "payment_ok": ["Bei Ihrem Abo gibt es gerade kein Zahlungsproblem."],
        "has_access": ["Ihr Konto hat gerade Premium-Zugang."],
        "claim_does_not_match": ["Auf Ihrem Konto sieht es etwas anders aus."],
        "charged_before_cancel": [
            "Die letzte Abbuchung war am {last_charged_on}, gekündigt haben Sie am {cancelled_on}, also nach dieser Abbuchung. Nach der Kündigung wurde nichts mehr abgebucht.",
            "Die letzte Abbuchung war vor Ihrer Kündigung. Danach wurde nichts mehr abgebucht.",
        ],
        "no_cancellation_recorded": ["Auf diesem Konto sehe ich keine Abbuchung nach Ihrer Kündigung."],
    },
    "action": {
        "MANAGE_SUBSCRIPTION_LINK": ["Ihre Abo-Seite ist {manage_url}. Dort können Sie es ansehen und ändern.",
                                     "Sie können Ihr Abo in den Abo-Einstellungen Ihres Store-Kontos verwalten."],
        "CANCEL_STEPS:app_store": [
            "So kündigen Sie: Öffnen Sie die Einstellungen auf dem iPhone, tippen Sie auf Ihren Namen, dann auf Abonnements, wählen Sie {product_name} und tippen Sie auf Abo kündigen ({manage_url}).",
            "So kündigen Sie: Öffnen Sie die Einstellungen auf dem iPhone, tippen Sie auf Ihren Namen, dann auf Abonnements, wählen Sie das Abo und tippen Sie auf Abo kündigen.",
        ],
        "CANCEL_STEPS:play_store": [
            "So kündigen Sie: Öffnen Sie Google Play, tippen Sie auf Ihr Profilbild, dann Zahlungen & Abos > Abos, wählen Sie {product_name} und tippen Sie auf Kündigen ({manage_url}).",
            "So kündigen Sie: Öffnen Sie Google Play, tippen Sie auf Ihr Profilbild, dann Zahlungen & Abos > Abos, wählen Sie das Abo und tippen Sie auf Kündigen.",
        ],
        "CANCEL_STEPS": ["Zum Kündigen schalten Sie die Verlängerung auf der Abo-Seite des Stores aus, in dem Sie abgeschlossen haben."],
        "REFUND_PATH_APPLE": [
            "Über Erstattungen für App-Store-Käufe entscheidet Apple, nicht wir. Sie können sie unter {refund_url} beantragen.",
            "Über Erstattungen für App-Store-Käufe entscheidet Apple, nicht wir. Sie können sie unter reportaproblem.apple.com beantragen.",
        ],
        "REFUND_PATH_GOOGLE": [
            "Sie können eine Erstattung über Google Play unter {refund_url} beantragen; Google prüft die Anfrage.",
            "Sie können eine Erstattung im Bestellverlauf von Google Play beantragen; Google prüft die Anfrage.",
        ],
        "RESTORE_PURCHASES_STEPS:app_store": ["Melden Sie sich auf dem neuen Gerät mit derselben Apple-ID an, mit der Sie gekauft haben, öffnen Sie die App und tippen Sie in ihren Einstellungen auf Käufe wiederherstellen."],
        "RESTORE_PURCHASES_STEPS:play_store": ["Melden Sie sich auf dem neuen Gerät mit demselben Google-Konto an, mit dem Sie gekauft haben, öffnen Sie die App und tippen Sie in ihren Einstellungen auf Käufe wiederherstellen."],
        "RESTORE_PURCHASES_STEPS": ["Melden Sie sich mit demselben Store-Konto an, mit dem Sie gekauft haben (Apple-ID oder Google-Konto), öffnen Sie die App und tippen Sie in ihren Einstellungen auf Käufe wiederherstellen."],
        "UPDATE_PAYMENT_METHOD:app_store": [
            "Bitte aktualisieren Sie Ihre Zahlungsmethode in Ihrem Apple-Konto: {payment_url} (oder Einstellungen > Ihr Name > Zahlung & Versand). Danach versucht der Store die Abbuchung erneut.",
            "Bitte aktualisieren Sie Ihre Zahlungsmethode unter Einstellungen > Ihr Name > Zahlung & Versand. Danach versucht der Store die Abbuchung erneut.",
        ],
        "UPDATE_PAYMENT_METHOD:play_store": [
            "Bitte aktualisieren Sie Ihre Zahlungsmethode in Google Play: {payment_url}. Danach versucht der Store die Abbuchung erneut.",
            "Bitte aktualisieren Sie Ihre Zahlungsmethode in Google Play > Zahlungen & Abos. Danach versucht der Store die Abbuchung erneut.",
        ],
        "UPDATE_PAYMENT_METHOD": ["Bitte aktualisieren Sie Ihre Zahlungsmethode in dem Store, in dem Sie abgeschlossen haben."],
        "PROPOSE_GRANT": [
            "Ich habe das Team gebeten, eine Verlängerung Ihres Zugangs um {grant_days} Tage aus Kulanz zu prüfen. Sie ist noch nicht aktiv und startet nur, wenn das Team zustimmt.",
            "Ich habe das Team gebeten, eine kurze Verlängerung Ihres Zugangs aus Kulanz zu prüfen. Sie ist noch nicht aktiv und startet nur, wenn das Team zustimmt.",
        ],
        "ESCALATE_TO_HUMAN": ["Ich habe Ihren Fall an unser Support-Team weitergegeben, eine Person meldet sich hier bei Ihnen."],
        "ESCALATE_TO_HUMAN:no_store": ["Dieser Kauf lief nicht über den App Store oder Google Play, deshalb habe ich Ihren Fall an unser Support-Team weitergegeben. Eine Person meldet sich hier bei Ihnen."],
    },
}

# =====================================================================================================================
# Portuguese (Brazil)
# =====================================================================================================================
PT = {
    "ack": {"charged_after_cancel": ["Você tem razão: você desativou a renovação em {cancelled_on} e mesmo assim houve uma cobrança em {last_charged_on}.", "Você tem razão: houve uma cobrança depois que você desativou a renovação."]},
    "status": {
        "ACTIVE_RENEWING": [
            "Sua assinatura {product_name} ({store_name}) está ativa e renova em {renews_on} por {price}.",
            "Sua assinatura {product_name} ({store_name}) está ativa e renova em {renews_on}.",
            "Sua assinatura {product_name} está ativa e renova automaticamente.",
            "Sua assinatura está ativa e renova automaticamente.",
        ],
        "CANCELLED_PAID_UP": [
            "Sua assinatura {product_name} está cancelada e não vai renovar. Você mantém o acesso completo até {expires_on}.",
            "Sua assinatura {product_name} está cancelada e não vai renovar.",
            "Sua assinatura está cancelada e não vai renovar.",
        ],
        "TRIAL_ACTIVE": [
            "Você está no teste grátis de {product_name}. Em {trial_ends_on} ele vira uma assinatura paga por {price}, a menos que você cancele antes.",
            "Você está no teste grátis de {product_name}. Em {trial_ends_on} ele vira uma assinatura paga, a menos que você cancele antes.",
            "Você está no teste grátis de {product_name}; se não cancelar, ele vira uma assinatura paga.",
            "Você está em um teste grátis; se não cancelar, ele vira uma assinatura paga.",
        ],
        "TRIAL_CANCELLED": [
            "Seu teste grátis de {product_name} está cancelado, então nada será cobrado. Você pode continuar usando até {trial_ends_on}.",
            "Seu teste grátis de {product_name} está cancelado, então nada será cobrado. Você pode continuar usando até {expires_on}.",
            "Seu teste grátis de {product_name} está cancelado, então nada será cobrado.",
            "Seu teste grátis está cancelado, então nada será cobrado.",
        ],
        "GRACE_PERIOD": [
            "{store_name} não conseguiu cobrar {product_name} (primeira falha em {billing_issue_on}). Você mantém o acesso enquanto a cobrança é tentada de novo, até {grace_ends_on}.",
            "{store_name} não conseguiu cobrar {product_name}. Por enquanto você mantém o acesso enquanto a cobrança é tentada de novo.",
            "A loja não conseguiu cobrar seu último pagamento. Por enquanto você mantém o acesso enquanto a cobrança é tentada de novo.",
        ],
        "BILLING_RETRY": [
            "{store_name} não conseguiu cobrar a renovação de {product_name} (desde {billing_issue_on}), então o premium está pausado enquanto a loja tenta de novo.",
            "{store_name} não conseguiu cobrar a renovação de {product_name}, então o premium está pausado enquanto a loja tenta de novo.",
            "A loja não conseguiu cobrar a renovação, então o premium está pausado enquanto ela tenta de novo.",
        ],
        "EXPIRED_BILLING_ERROR": [
            "Sua assinatura {product_name} terminou em {expires_on} porque {store_name} não conseguiu cobrar a renovação.",
            "Sua assinatura {product_name} terminou porque a loja não conseguiu cobrar a renovação.",
            "Sua assinatura terminou porque a loja não conseguiu cobrar a renovação.",
        ],
        "EXPIRED_CANCELLED": [
            "Sua assinatura {product_name} foi cancelada e terminou em {expires_on}; ela não está mais ativa e não vai renovar.",
            "Sua assinatura {product_name} foi cancelada e já terminou, então não vai renovar.",
            "Sua assinatura foi cancelada e já terminou, então não vai renovar.",
        ],
        "REFUNDED": [
            "A compra de {product_name} foi reembolsada em {refunded_on}, por isso essa assinatura não está mais ativa.",
            "A compra de {product_name} foi reembolsada, por isso essa assinatura não está mais ativa.",
            "Esta compra foi reembolsada, por isso a assinatura não está mais ativa.",
        ],
        "LIFETIME": [
            "Você tem acesso vitalício a {product_name}: é uma compra única, então não há renovação nem novas cobranças.",
            "Você tem acesso vitalício: é uma compra única, então não há renovação nem novas cobranças.",
        ],
        "GRANTED_BY_DEVELOPER": [
            "Seu acesso a {product_name} é um presente da equipe do app e vale até {granted_until}. Não é uma assinatura paga, então nada será cobrado.",
            "Seu acesso a {product_name} é um presente da equipe do app e vale até {expires_on}. Não é uma assinatura paga, então nada será cobrado.",
            "Seu acesso é um presente da equipe do app. Não é uma assinatura paga, então nada será cobrado.",
        ],
        "NO_PURCHASE": [
            "Não encontro nenhuma compra nesta conta. Se você pagou com outro ID Apple ou outra conta Google, a compra está vinculada a essa conta.",
        ],
        "FAMILY_SHARED": [
            "Seu acesso a {product_name} vem do Compartilhamento Familiar, então a assinatura e a cobrança pertencem à conta do organizador da família, não à sua.",
            "Seu acesso vem do Compartilhamento Familiar, então a assinatura e a cobrança pertencem à conta do organizador da família, não à sua.",
        ],
    },
    "contra": {
        "not_cancelled": ["Não vejo nenhum cancelamento nesta assinatura. Ela continua configurada para renovar."],
        "nothing_charged": ["Nada foi cobrado por isso, pois você está no teste grátis."],
        "renewal_charge_failed": ["A cobrança da renovação não foi concluída, então um novo período não foi cobrado."],
        "already_refunded": ["Esta compra já foi reembolsada."],
        "one_time_purchase": ["O acesso vitalício é uma compra única, sem cobranças recorrentes."],
        "no_charge_on_account": ["Não vejo nenhuma cobrança de assinatura nesta conta."],
        "organizer_pays": ["As cobranças do Compartilhamento Familiar vão para o organizador da família, não para a sua conta."],
        "refund_ended_access": ["O acesso terminou porque a compra foi reembolsada."],
        "period_ended": ["Seu período pago terminou; por isso o premium está bloqueado agora."],
        "no_purchase_on_account": ["Ainda não vejo nenhuma compra nesta conta."],
        "organizer_must_request": ["Só o organizador da família, que fez o pagamento, pode pedir reembolso à loja."],
        "payment_ok": ["No momento não há nenhum problema de pagamento na sua assinatura."],
        "has_access": ["Sua conta está com acesso premium agora."],
        "claim_does_not_match": ["O que vejo na sua conta é um pouco diferente."],
        "charged_before_cancel": [
            "A última cobrança foi em {last_charged_on} e você desativou a renovação em {cancelled_on}, depois dessa cobrança. Então, nada foi cobrado após o cancelamento.",
            "A última cobrança foi antes do seu cancelamento. Depois dele, nada foi cobrado.",
        ],
        "no_cancellation_recorded": ["Não vejo nenhuma cobrança depois do seu cancelamento nesta conta."],
    },
    "action": {
        "MANAGE_SUBSCRIPTION_LINK": ["A página da sua assinatura é {manage_url}. Lá você pode ver e alterar.",
                                     "Você pode gerenciar sua assinatura nas configurações de assinaturas da sua conta da loja."],
        "CANCEL_STEPS:app_store": [
            "Para cancelar: abra Ajustes no iPhone, toque no seu nome, depois em Assinaturas, escolha {product_name} e toque em Cancelar Assinatura ({manage_url}).",
            "Para cancelar: abra Ajustes no iPhone, toque no seu nome, depois em Assinaturas, escolha a assinatura e toque em Cancelar Assinatura.",
        ],
        "CANCEL_STEPS:play_store": [
            "Para cancelar: abra o Google Play, toque na sua foto de perfil, depois em Pagamentos e assinaturas > Assinaturas, escolha {product_name} e toque em Cancelar assinatura ({manage_url}).",
            "Para cancelar: abra o Google Play, toque na sua foto de perfil, depois em Pagamentos e assinaturas > Assinaturas, escolha a assinatura e toque em Cancelar assinatura.",
        ],
        "CANCEL_STEPS": ["Para cancelar, desative a renovação na página de assinaturas da loja onde você assinou."],
        "REFUND_PATH_APPLE": [
            "Reembolsos de compras na App Store são decididos pela Apple, não por nós. Você pode solicitar em {refund_url}.",
            "Reembolsos de compras na App Store são decididos pela Apple, não por nós. Você pode solicitar em reportaproblem.apple.com.",
        ],
        "REFUND_PATH_GOOGLE": [
            "Você pode solicitar um reembolso pelo Google Play em {refund_url}; o Google analisa o pedido.",
            "Você pode solicitar um reembolso pelo histórico de pedidos do Google Play; o Google analisa o pedido.",
        ],
        "RESTORE_PURCHASES_STEPS:app_store": ["No novo aparelho, entre com o mesmo ID Apple usado na compra, abra o app e toque em Restaurar compras nas configurações dele."],
        "RESTORE_PURCHASES_STEPS:play_store": ["No novo aparelho, entre com a mesma conta Google usada na compra, abra o app e toque em Restaurar compras nas configurações dele."],
        "RESTORE_PURCHASES_STEPS": ["Entre com a mesma conta da loja usada na compra, abra o app e toque em Restaurar compras nas configurações dele."],
        "UPDATE_PAYMENT_METHOD:app_store": [
            "Atualize sua forma de pagamento na sua conta Apple: {payment_url} (ou Ajustes > seu nome > Pagamento e Envio). Depois, a loja tentará a cobrança de novo.",
            "Atualize sua forma de pagamento em Ajustes > seu nome > Pagamento e Envio. Depois, a loja tentará a cobrança de novo.",
        ],
        "UPDATE_PAYMENT_METHOD:play_store": [
            "Atualize sua forma de pagamento no Google Play: {payment_url}. Depois, a loja tentará a cobrança de novo.",
            "Atualize sua forma de pagamento em Google Play > Pagamentos e assinaturas. Depois, a loja tentará a cobrança de novo.",
        ],
        "UPDATE_PAYMENT_METHOD": ["Atualize sua forma de pagamento na loja onde você assinou."],
        "PROPOSE_GRANT": [
            "Pedi à equipe que analise uma extensão de cortesia de {grant_days} dias para o seu acesso. Ainda não está ativa e só começa se for aprovada.",
            "Pedi à equipe que analise uma breve extensão de cortesia para o seu acesso. Ainda não está ativa e só começa se for aprovada.",
        ],
        "ESCALATE_TO_HUMAN": ["Passei seu caso para a nossa equipe de suporte, e uma pessoa vai responder aqui."],
        "ESCALATE_TO_HUMAN:no_store": ["Esta compra não foi feita pela App Store nem pelo Google Play, então passei seu caso para a nossa equipe de suporte. Uma pessoa vai responder aqui."],
    },
}

# =====================================================================================================================
# Russian
# =====================================================================================================================
RU = {
    "ack": {"charged_after_cancel": ["Вы правы: продление вы отключили {cancelled_on}, но {last_charged_on} всё равно прошло списание.", "Вы правы: списание прошло уже после того, как вы отключили продление."]},
    "status": {
        "ACTIVE_RENEWING": [
            "Ваша подписка {product_name} ({store_name}) активна. Следующее продление: {renews_on}, стоимость: {price}.",
            "Ваша подписка {product_name} ({store_name}) активна. Следующее продление: {renews_on}.",
            "Ваша подписка {product_name} активна и продлевается автоматически.",
            "Ваша подписка активна и продлевается автоматически.",
        ],
        "CANCELLED_PAID_UP": [
            "Ваша подписка {product_name} отменена и не продлится. Полный доступ сохраняется до {expires_on}.",
            "Ваша подписка {product_name} отменена и не продлится.",
            "Ваша подписка отменена и не продлится.",
        ],
        "TRIAL_ACTIVE": [
            "У вас бесплатный пробный период {product_name}. Если не отменить его раньше, {trial_ends_on} он перейдёт в платную подписку за {price}.",
            "У вас бесплатный пробный период {product_name}. Если не отменить его раньше, {trial_ends_on} он перейдёт в платную подписку.",
            "У вас бесплатный пробный период {product_name}; если его не отменить, он перейдёт в платную подписку.",
            "У вас бесплатный пробный период; если его не отменить, он перейдёт в платную подписку.",
        ],
        "TRIAL_CANCELLED": [
            "Ваш бесплатный пробный период {product_name} отменён, поэтому ничего списано не будет. Пользоваться можно до {trial_ends_on}.",
            "Ваш бесплатный пробный период {product_name} отменён, поэтому ничего списано не будет. Пользоваться можно до {expires_on}.",
            "Ваш бесплатный пробный период {product_name} отменён, поэтому ничего списано не будет.",
            "Ваш бесплатный пробный период отменён, поэтому ничего списано не будет.",
        ],
        "GRACE_PERIOD": [
            "{store_name} не удалось списать оплату за {product_name} (первая неудачная попытка: {billing_issue_on}). Пока оплата повторяется, доступ сохраняется до {grace_ends_on}.",
            "{store_name} не удалось списать оплату за {product_name}. Пока оплата повторяется, доступ пока сохраняется.",
            "Магазину не удалось списать последнюю оплату. Пока оплата повторяется, доступ пока сохраняется.",
        ],
        "BILLING_RETRY": [
            "{store_name} не удалось списать оплату продления {product_name} (с {billing_issue_on}), поэтому премиум приостановлен, пока магазин повторяет попытки.",
            "{store_name} не удалось списать оплату продления {product_name}, поэтому премиум приостановлен, пока магазин повторяет попытки.",
            "Магазину не удалось списать оплату продления, поэтому премиум приостановлен, пока он повторяет попытки.",
        ],
        "EXPIRED_BILLING_ERROR": [
            "Ваша подписка {product_name} закончилась {expires_on}, потому что {store_name} не удалось списать оплату продления.",
            "Ваша подписка {product_name} закончилась, потому что магазину не удалось списать оплату продления.",
            "Ваша подписка закончилась, потому что магазину не удалось списать оплату продления.",
        ],
        "EXPIRED_CANCELLED": [
            "Ваша подписка {product_name} была отменена и закончилась {expires_on}; она больше не активна и не продлится.",
            "Ваша подписка {product_name} была отменена и уже закончилась, поэтому не продлится.",
            "Ваша подписка была отменена и уже закончилась, поэтому не продлится.",
        ],
        "REFUNDED": [
            "За покупку {product_name} {refunded_on} был сделан возврат, поэтому эта подписка больше не активна.",
            "За покупку {product_name} был сделан возврат, поэтому эта подписка больше не активна.",
            "За эту покупку был сделан возврат, поэтому подписка больше не активна.",
        ],
        "LIFETIME": [
            "У вас пожизненный доступ к {product_name}: это разовая покупка, поэтому нет ни продлений, ни новых списаний.",
            "У вас пожизненный доступ: это разовая покупка, поэтому нет ни продлений, ни новых списаний.",
        ],
        "GRANTED_BY_DEVELOPER": [
            "Ваш доступ к {product_name} является подарком от команды приложения и действует до {granted_until}. Это не платная подписка, поэтому ничего списано не будет.",
            "Ваш доступ к {product_name} является подарком от команды приложения и действует до {expires_on}. Это не платная подписка, поэтому ничего списано не будет.",
            "Ваш доступ является подарком от команды приложения. Это не платная подписка, поэтому ничего списано не будет.",
        ],
        "NO_PURCHASE": [
            "Я не вижу покупок в этом аккаунте. Если вы платили с другого Apple ID или аккаунта Google, покупка привязана к тому аккаунту.",
        ],
        "FAMILY_SHARED": [
            "Ваш доступ к {product_name} приходит через Семейный доступ, поэтому подписка и оплата относятся к аккаунту организатора семьи, а не к вашему.",
            "Ваш доступ приходит через Семейный доступ, поэтому подписка и оплата относятся к аккаунту организатора семьи, а не к вашему.",
        ],
    },
    "contra": {
        "not_cancelled": ["Я не вижу отмены этой подписки. Она по-прежнему продлевается автоматически."],
        "nothing_charged": ["За это ничего не списывалось, потому что у вас бесплатный пробный период."],
        "renewal_charge_failed": ["Списание за продление не прошло, поэтому новый период не оплачен."],
        "already_refunded": ["За эту покупку уже был сделан возврат."],
        "one_time_purchase": ["Пожизненный доступ является разовой покупкой, регулярных списаний нет."],
        "no_charge_on_account": ["Я не вижу списаний за подписку в этом аккаунте."],
        "organizer_pays": ["Списания за Семейный доступ идут организатору семьи, а не на ваш аккаунт."],
        "refund_ended_access": ["Доступ закончился, потому что за покупку был сделан возврат."],
        "period_ended": ["Оплаченный период закончился, поэтому премиум сейчас недоступен."],
        "no_purchase_on_account": ["Я пока не вижу покупок в этом аккаунте."],
        "organizer_must_request": ["Запросить возврат в магазине может только организатор семьи, который платил."],
        "payment_ok": ["Сейчас с оплатой вашей подписки всё в порядке."],
        "has_access": ["Сейчас у вашего аккаунта есть премиум-доступ."],
        "claim_does_not_match": ["В вашем аккаунте я вижу немного другую картину."],
        "charged_before_cancel": [
            "Последнее списание было {last_charged_on}, а продление вы отключили {cancelled_on}, уже после него. Поэтому после отмены ничего не списывалось.",
            "Последнее списание было до вашей отмены. После неё ничего не списывалось.",
        ],
        "no_cancellation_recorded": ["Я не вижу списаний после вашей отмены в этом аккаунте."],
    },
    "action": {
        "MANAGE_SUBSCRIPTION_LINK": ["Страница вашей подписки: {manage_url}. Там её можно посмотреть и изменить.",
                                     "Управлять подпиской можно в настройках подписок вашего аккаунта магазина."],
        "CANCEL_STEPS:app_store": [
            "Чтобы отменить: откройте Настройки на iPhone, нажмите на своё имя, затем «Подписки», выберите {product_name} и нажмите «Отменить подписку» ({manage_url}).",
            "Чтобы отменить: откройте Настройки на iPhone, нажмите на своё имя, затем «Подписки», выберите подписку и нажмите «Отменить подписку».",
        ],
        "CANCEL_STEPS:play_store": [
            "Чтобы отменить: откройте Google Play, нажмите на значок профиля, затем «Платежи и подписки» > «Подписки», выберите {product_name} и нажмите «Отменить подписку» ({manage_url}).",
            "Чтобы отменить: откройте Google Play, нажмите на значок профиля, затем «Платежи и подписки» > «Подписки», выберите подписку и нажмите «Отменить подписку».",
        ],
        "CANCEL_STEPS": ["Чтобы отменить, отключите продление на странице подписок в магазине, где вы оформили подписку."],
        "REFUND_PATH_APPLE": [
            "Решение о возврате за покупки в App Store принимает Apple, а не мы. Запросить возврат можно на {refund_url}.",
            "Решение о возврате за покупки в App Store принимает Apple, а не мы. Запросить возврат можно на reportaproblem.apple.com.",
        ],
        "REFUND_PATH_GOOGLE": [
            "Запросить возврат можно через Google Play: {refund_url}; запрос рассматривает Google.",
            "Запросить возврат можно в истории заказов Google Play; запрос рассматривает Google.",
        ],
        "RESTORE_PURCHASES_STEPS:app_store": ["На новом устройстве войдите с тем же Apple ID, с которого была покупка, откройте приложение и нажмите «Восстановить покупки» в его настройках."],
        "RESTORE_PURCHASES_STEPS:play_store": ["На новом устройстве войдите в тот же аккаунт Google, с которого была покупка, откройте приложение и нажмите «Восстановить покупки» в его настройках."],
        "RESTORE_PURCHASES_STEPS": ["Войдите в тот же аккаунт магазина, с которого была покупка, откройте приложение и нажмите «Восстановить покупки» в его настройках."],
        "UPDATE_PAYMENT_METHOD:app_store": [
            "Обновите способ оплаты в аккаунте Apple: {payment_url} (или Настройки > ваше имя > «Оплата и доставка»). После этого магазин повторит списание.",
            "Обновите способ оплаты в Настройки > ваше имя > «Оплата и доставка». После этого магазин повторит списание.",
        ],
        "UPDATE_PAYMENT_METHOD:play_store": [
            "Обновите способ оплаты в Google Play: {payment_url}. После этого магазин повторит списание.",
            "Обновите способ оплаты в Google Play > «Платежи и подписки». После этого магазин повторит списание.",
        ],
        "UPDATE_PAYMENT_METHOD": ["Обновите способ оплаты в магазине, где вы оформили подписку."],
        "PROPOSE_GRANT": [
            "Мы попросили команду рассмотреть продление вашего доступа в качестве жеста доброй воли (дней: {grant_days}). Оно пока не действует и начнётся, только если его одобрят.",
            "Мы попросили команду рассмотреть короткое продление вашего доступа в качестве жеста доброй воли. Оно пока не действует и начнётся, только если его одобрят.",
        ],
        "ESCALATE_TO_HUMAN": ["Мы передали ваш вопрос нашей команде поддержки. Сотрудник ответит вам здесь."],
        "ESCALATE_TO_HUMAN:no_store": ["Эта покупка сделана не через App Store или Google Play, поэтому мы передали ваш вопрос команде поддержки. Сотрудник ответит вам здесь."],
    },
}

# =====================================================================================================================
# Round 2 additions (bug bash): new intents, pending grant, never-charged trials, charge not on the account, …
# Merged into the language dicts below. "intent" lines lead the reply; "extra" lines are added by condition.
# =====================================================================================================================
ROUND2: dict[str, dict] = {
    "en": {
        "intent": {
            "HUMAN_REQUEST:escalated": ["Of course. I've passed your conversation to our support team, and a person will reply to you here."],
            "HUMAN_REQUEST": ["I'm the app's automated help; tell me what happened and I'll check your account right away."],
            "ACKNOWLEDGEMENT:thanks": ["You're welcome! If anything else comes up with your subscription, just write here."],
            "ACKNOWLEDGEMENT": ["How can I help? I can explain your subscription, help you cancel, get premium back on a new device, or show you how to request a refund."],
            "OTHER_APP": ["I can only help with your {app_name} subscription. For another app, please contact that app's support. Your store's subscription list shows who is charging you.",
                          "I can only help with this app's subscription. For another app, please contact that app's support."],
            "PRIVACY_REQUEST:escalated": ["Thank you. I've passed your data request to the {app_name} team; they will handle it and confirm with you. Deleting your data doesn't cancel a store subscription; that is done in your store account.",
                                          "Thank you. I've passed your data request to the app team; they will handle it and confirm with you. Deleting your data doesn't cancel a store subscription."],
            "PRIVACY_REQUEST": ["Data requests are handled by the {app_name} team. Deleting your data doesn't cancel a store subscription; that is done in your store account.",
                                "Data requests are handled by the app team. Deleting your data doesn't cancel a store subscription."],
            "THIRD_PARTY_ACCOUNT": ["I can only see the account this message comes from, so I can't share anything about someone else's subscription. They can write to us from the app on their own account."],
            "DISCOUNT_REQUEST": ["I can't offer discounts or change prices myself, because prices are set in the store."],
        },
        "extra": {
            "pending_grant": ["Your request for a courtesy extension is still with the team for review. It isn't active yet, and you'll see it in the app once it's approved."],
            "cannot_act": ["I can't cancel it for you. A subscription can only be cancelled from your own Apple ID or Google account."],
            "chargeback": ["A refund request through the store is usually faster than a chargeback, and a chargeback can lead the store to lock your account."],
            "angry": ["I'm sorry this has been so frustrating."],
        },
        "contra": {
            "charge_not_found": ["I don't see a charge like that on your {app_name} account. It may have been made with another Apple ID or Google account, or by another app. Your store's purchase history shows who charged you.",
                                 "I don't see a charge like that on this account. It may have been made with another Apple ID or Google account, or by another app. Your store's purchase history shows who charged you."],
            "never_charged": ["You were never charged: the free trial ended without a payment."],
        },
        "status": {
            "EXPIRED_BILLING_ERROR:never_charged": ["Your free trial of {product_name} ended on {expires_on} without a payment. {store_name} couldn't charge your payment method, so nothing was charged.",
                                                    "Your free trial ended without a payment, so nothing was charged."],
            "EXPIRED_CANCELLED:never_charged": ["Your free trial of {product_name} was cancelled and ended on {expires_on}, so you were never charged.",
                                                "Your free trial was cancelled and has ended, so you were never charged."],
        },
        "trial_first": [
            "You're on the free trial of {product_name}. On {trial_ends_on} it becomes a paid subscription at {price_after_trial} unless you cancel before {cancel_before}.",
            "You're on the free trial of {product_name}. On {trial_ends_on} it becomes a paid subscription at {price_after_trial} unless you cancel before then.",
            "You're on the free trial of {product_name}. On {trial_ends_on} it becomes a paid subscription unless you cancel before {cancel_before}.",
        ],
    },
    "sr": {
        "intent": {
            "HUMAN_REQUEST:escalated": ["Naravno, prosledili smo razgovor našem timu podrške i neko iz tima će vam odgovoriti ovde."],
            "HUMAN_REQUEST": ["Ja sam automatska pomoć aplikacije; napišite mi šta se desilo i odmah ću proveriti vaš nalog."],
            "ACKNOWLEDGEMENT:thanks": ["Nema na čemu! Ako vam bude trebalo još nešto oko pretplate, samo pišite ovde."],
            "ACKNOWLEDGEMENT": ["Kako mogu da pomognem? Mogu da objasnim vašu pretplatu, pomognem oko otkazivanja, pomognem da vratite premium na novom uređaju ili pokažem kako da zatražite povraćaj novca."],
            "OTHER_APP": ["Mogu da pomognem samo oko pretplate na {app_name}. Za drugu aplikaciju obratite se njenoj podršci. U listi pretplata u prodavnici vidite ko vam naplaćuje.",
                          "Mogu da pomognem samo oko pretplate na ovu aplikaciju. Za drugu aplikaciju obratite se njenoj podršci."],
            "PRIVACY_REQUEST:escalated": ["Hvala. Vaš zahtev u vezi sa podacima prosledili smo timu aplikacije {app_name}; oni će ga obraditi i javiti vam se. Brisanje podataka ne otkazuje pretplatu u prodavnici; to se radi na vašem nalogu prodavnice.",
                                          "Hvala. Vaš zahtev u vezi sa podacima prosledili smo timu aplikacije; oni će ga obraditi i javiti vam se. Brisanje podataka ne otkazuje pretplatu u prodavnici."],
            "PRIVACY_REQUEST": ["Zahteve u vezi sa podacima obrađuje tim aplikacije {app_name}. Brisanje podataka ne otkazuje pretplatu u prodavnici; to se radi na vašem nalogu prodavnice.",
                                "Zahteve u vezi sa podacima obrađuje tim aplikacije. Brisanje podataka ne otkazuje pretplatu u prodavnici."],
            "THIRD_PARTY_ACCOUNT": ["Vidim samo nalog sa kog je stigla ova poruka, pa ne mogu da delim podatke o tuđoj pretplati. Ta osoba nam može pisati iz aplikacije sa svog naloga."],
            "DISCOUNT_REQUEST": ["Ne mogu da ponudim popust ni besplatan period jer cene određuje prodavnica."],
        },
        "extra": {
            "pending_grant": ["Vaš zahtev za produženje pristupa kao gest dobre volje tim još razmatra. Još nije aktivno, a videćete ga u aplikaciji kada bude odobreno."],
            "cannot_act": ["Ne mogu da otkažem umesto vas. Pretplata se može otkazati samo sa vašeg Apple ID-ja ili Google naloga."],
            "chargeback": ["Zahtev za povraćaj preko prodavnice je obično brži od reklamacije u banci, a reklamacija može dovesti do toga da prodavnica zaključa vaš nalog."],
            "angry": ["Žao mi je što je ovo toliko frustrirajuće."],
        },
        "contra": {
            "charge_not_found": ["Na vašem nalogu za {app_name} ne vidim takvu naplatu. Možda je napravljena drugim Apple ID-jem ili Google nalogom, ili je to druga aplikacija. U istoriji kupovina u prodavnici vidite ko vam je naplatio.",
                                 "Na ovom nalogu ne vidim takvu naplatu. Možda je napravljena drugim Apple ID-jem ili Google nalogom, ili je to druga aplikacija. U istoriji kupovina u prodavnici vidite ko vam je naplatio."],
            "never_charged": ["Nikada vam ništa nije naplaćeno: besplatni probni period je istekao bez plaćanja."],
        },
        "status": {
            "EXPIRED_BILLING_ERROR:never_charged": ["Vaš besplatni probni period za {product_name} istekao je {expires_on} bez plaćanja jer {store_name} nije uspeo da naplati, pa vam ništa nije naplaćeno.",
                                                    "Vaš besplatni probni period je istekao bez plaćanja, pa vam ništa nije naplaćeno."],
            "EXPIRED_CANCELLED:never_charged": ["Vaš besplatni probni period za {product_name} je otkazan i istekao je {expires_on}, tako da vam nikada ništa nije naplaćeno.",
                                                "Vaš besplatni probni period je otkazan i istekao je, tako da vam nikada ništa nije naplaćeno."],
        },
        "trial_first": [
            "Koristite besplatni probni period za {product_name}. {trial_ends_on} prelazi u plaćenu pretplatu po ceni od {price_after_trial}, osim ako je ne otkažete pre {cancel_before}.",
            "Koristite besplatni probni period za {product_name}. Ako ga ne otkažete ranije, {trial_ends_on} prelazi u plaćenu pretplatu po ceni od {price_after_trial}.",
            "Koristite besplatni probni period za {product_name}. {trial_ends_on} prelazi u plaćenu pretplatu, osim ako je ne otkažete pre {cancel_before}.",
        ],
    },
    "es": {
        "intent": {
            "HUMAN_REQUEST:escalated": ["Claro: he pasado tu conversación a nuestro equipo de soporte y una persona te responderá aquí."],
            "HUMAN_REQUEST": ["Soy la ayuda automática de la app; cuéntame qué pasó y reviso tu cuenta enseguida."],
            "ACKNOWLEDGEMENT:thanks": ["¡De nada! Si necesitas algo más con tu suscripción, escribe aquí."],
            "ACKNOWLEDGEMENT": ["¿En qué te ayudo? Puedo explicarte tu suscripción, ayudarte a cancelarla, recuperar premium en un dispositivo nuevo o mostrarte cómo pedir un reembolso."],
            "OTHER_APP": ["Solo puedo ayudarte con tu suscripción de {app_name}. Para otra app, contacta con su soporte; la lista de suscripciones de tu tienda muestra quién te cobra.",
                          "Solo puedo ayudarte con la suscripción de esta app. Para otra app, contacta con su soporte."],
            "PRIVACY_REQUEST:escalated": ["Gracias: he pasado tu solicitud sobre tus datos al equipo de {app_name}, que la gestionará y te lo confirmará. Borrar tus datos no cancela una suscripción de la tienda; eso se hace en tu cuenta de la tienda.",
                                          "Gracias: he pasado tu solicitud sobre tus datos al equipo de la app, que la gestionará y te lo confirmará. Borrar tus datos no cancela una suscripción de la tienda."],
            "PRIVACY_REQUEST": ["Las solicitudes sobre datos las gestiona el equipo de {app_name}. Borrar tus datos no cancela una suscripción de la tienda; eso se hace en tu cuenta de la tienda.",
                                "Las solicitudes sobre datos las gestiona el equipo de la app. Borrar tus datos no cancela una suscripción de la tienda."],
            "THIRD_PARTY_ACCOUNT": ["Solo puedo ver la cuenta desde la que llega este mensaje, así que no puedo compartir nada sobre la suscripción de otra persona. Esa persona puede escribirnos desde la app con su propia cuenta."],
            "DISCOUNT_REQUEST": ["No puedo ofrecer descuentos ni tiempo gratis: los precios los fija la tienda."],
        },
        "extra": {
            "pending_grant": ["Tu solicitud de extensión de cortesía sigue en revisión por el equipo: aún no está activa y la verás en la app cuando la aprueben."],
            "cannot_act": ["No puedo cancelarla por ti: una suscripción solo se puede cancelar desde tu propio Apple ID o cuenta de Google."],
            "chargeback": ["Pedir el reembolso a la tienda suele ser más rápido que un contracargo, y un contracargo puede hacer que la tienda bloquee tu cuenta."],
            "angry": ["Siento mucho que esto haya sido tan frustrante."],
        },
        "contra": {
            "charge_not_found": ["No veo un cobro así en tu cuenta de {app_name}. Puede que se hiciera con otro Apple ID u otra cuenta de Google, o que sea de otra app; el historial de compras de tu tienda muestra quién te cobró.",
                                 "No veo un cobro así en esta cuenta. Puede que se hiciera con otro Apple ID u otra cuenta de Google, o que sea de otra app; el historial de compras de tu tienda muestra quién te cobró."],
            "never_charged": ["Nunca se te cobró nada: la prueba gratuita terminó sin ningún pago."],
        },
        "status": {
            "EXPIRED_BILLING_ERROR:never_charged": ["Tu prueba gratuita de {product_name} terminó el {expires_on} sin ningún pago: {store_name} no pudo cobrar, así que no se te cobró nada.",
                                                    "Tu prueba gratuita terminó sin ningún pago, así que no se te cobró nada."],
            "EXPIRED_CANCELLED:never_charged": ["Tu prueba gratuita de {product_name} se canceló y terminó el {expires_on}, así que nunca se te cobró.",
                                                "Tu prueba gratuita se canceló y ya terminó, así que nunca se te cobró."],
        },
        "trial_first": [
            "Estás en la prueba gratuita de {product_name}. El {trial_ends_on} pasará a ser una suscripción de pago por {price_after_trial}, salvo que la canceles antes del {cancel_before}.",
            "Estás en la prueba gratuita de {product_name}. El {trial_ends_on} pasará a ser una suscripción de pago por {price_after_trial}, salvo que la canceles antes.",
            "Estás en la prueba gratuita de {product_name}. El {trial_ends_on} pasará a ser una suscripción de pago, salvo que la canceles antes del {cancel_before}.",
        ],
    },
    "de": {
        "intent": {
            "HUMAN_REQUEST:escalated": ["Selbstverständlich. Ich habe Ihr Gespräch an unser Support-Team weitergegeben, eine Person meldet sich hier bei Ihnen."],
            "HUMAN_REQUEST": ["Ich bin die automatische Hilfe der App; schreiben Sie mir, was passiert ist, dann prüfe ich Ihr Konto sofort."],
            "ACKNOWLEDGEMENT:thanks": ["Gern geschehen! Wenn Sie noch etwas zu Ihrem Abo brauchen, schreiben Sie einfach hier."],
            "ACKNOWLEDGEMENT": ["Wie kann ich helfen? Ich kann Ihnen Ihr Abo erklären, beim Kündigen helfen, Premium auf ein neues Gerät zurückholen oder zeigen, wie Sie eine Erstattung beantragen."],
            "OTHER_APP": ["Ich kann nur bei Ihrem {app_name}-Abo helfen. Bei einer anderen App wenden Sie sich bitte an deren Support. In der Abo-Liste Ihres Stores sehen Sie, wer abbucht.",
                          "Ich kann nur beim Abo dieser App helfen. Bei einer anderen App wenden Sie sich bitte an deren Support."],
            "PRIVACY_REQUEST:escalated": ["Danke. Ich habe Ihre Datenanfrage an das {app_name}-Team weitergegeben; es bearbeitet sie und bestätigt sie Ihnen. Das Löschen Ihrer Daten kündigt kein Store-Abo; das geht in Ihrem Store-Konto.",
                                          "Danke. Ich habe Ihre Datenanfrage an das App-Team weitergegeben; es bearbeitet sie und bestätigt sie Ihnen. Das Löschen Ihrer Daten kündigt kein Store-Abo."],
            "PRIVACY_REQUEST": ["Datenanfragen bearbeitet das {app_name}-Team. Das Löschen Ihrer Daten kündigt kein Store-Abo; das geht in Ihrem Store-Konto.",
                                "Datenanfragen bearbeitet das App-Team. Das Löschen Ihrer Daten kündigt kein Store-Abo."],
            "THIRD_PARTY_ACCOUNT": ["Ich sehe nur das Konto, von dem diese Nachricht kommt, und kann daher nichts über das Abo einer anderen Person sagen. Diese Person kann uns aus der App mit ihrem eigenen Konto schreiben."],
            "DISCOUNT_REQUEST": ["Rabatte oder Gratiszeit kann ich selbst nicht anbieten, denn die Preise legt der Store fest."],
        },
        "extra": {
            "pending_grant": ["Ihre Anfrage für eine Verlängerung aus Kulanz liegt noch beim Team zur Prüfung. Sie ist noch nicht aktiv, und Sie sehen sie in der App, sobald sie genehmigt ist."],
            "cannot_act": ["Ich kann das Abo nicht für Sie kündigen. Ein Abo lässt sich nur über Ihre eigene Apple-ID oder Ihr Google-Konto kündigen."],
            "chargeback": ["Eine Erstattungsanfrage beim Store ist meist schneller als eine Rückbuchung über die Bank, und eine Rückbuchung kann dazu führen, dass der Store Ihr Konto sperrt."],
            "angry": ["Es tut mir leid, dass das so ärgerlich war."],
        },
        "contra": {
            "charge_not_found": ["Eine solche Abbuchung sehe ich auf Ihrem {app_name}-Konto nicht. Sie könnte über eine andere Apple-ID oder ein anderes Google-Konto oder von einer anderen App stammen. Im Kaufverlauf Ihres Stores sehen Sie, wer abgebucht hat.",
                                 "Eine solche Abbuchung sehe ich auf diesem Konto nicht. Sie könnte über eine andere Apple-ID oder ein anderes Google-Konto oder von einer anderen App stammen. Im Kaufverlauf Ihres Stores sehen Sie, wer abgebucht hat."],
            "never_charged": ["Ihnen wurde nie etwas berechnet: Die kostenlose Testphase ist ohne Zahlung abgelaufen."],
        },
        "status": {
            "EXPIRED_BILLING_ERROR:never_charged": ["Ihre kostenlose Testphase von {product_name} ist am {expires_on} ohne Zahlung abgelaufen. {store_name} konnte nicht abbuchen, Ihnen wurde also nichts berechnet.",
                                                    "Ihre kostenlose Testphase ist ohne Zahlung abgelaufen, Ihnen wurde also nichts berechnet."],
            "EXPIRED_CANCELLED:never_charged": ["Ihre kostenlose Testphase von {product_name} wurde gekündigt und ist am {expires_on} abgelaufen, Ihnen wurde also nie etwas berechnet.",
                                                "Ihre kostenlose Testphase wurde gekündigt und ist abgelaufen, Ihnen wurde also nie etwas berechnet."],
        },
        "trial_first": [
            "Sie nutzen gerade die kostenlose Testphase von {product_name}. Am {trial_ends_on} wird daraus ein bezahltes Abo für {price_after_trial}, wenn Sie nicht vor dem {cancel_before} kündigen.",
            "Sie nutzen gerade die kostenlose Testphase von {product_name}. Am {trial_ends_on} wird daraus ein bezahltes Abo für {price_after_trial}, wenn Sie nicht vorher kündigen.",
            "Sie nutzen gerade die kostenlose Testphase von {product_name}. Am {trial_ends_on} wird daraus ein bezahltes Abo, wenn Sie nicht vor dem {cancel_before} kündigen.",
        ],
    },
    "pt": {
        "intent": {
            "HUMAN_REQUEST:escalated": ["Claro, passei sua conversa para a nossa equipe de suporte, e uma pessoa vai responder aqui."],
            "HUMAN_REQUEST": ["Sou a ajuda automática do app; me conte o que aconteceu e eu verifico sua conta na hora."],
            "ACKNOWLEDGEMENT:thanks": ["De nada! Se precisar de mais alguma coisa com sua assinatura, é só escrever aqui."],
            "ACKNOWLEDGEMENT": ["Como posso ajudar? Posso explicar sua assinatura, ajudar a cancelar, recuperar o premium em um aparelho novo ou mostrar como pedir reembolso."],
            "OTHER_APP": ["Só posso ajudar com sua assinatura do {app_name}. Para outro app, fale com o suporte dele. A lista de assinaturas da sua loja mostra quem está cobrando você.",
                          "Só posso ajudar com a assinatura deste app. Para outro app, fale com o suporte dele."],
            "PRIVACY_REQUEST:escalated": ["Obrigado. Passei seu pedido sobre dados para a equipe do {app_name}, que vai tratá-lo e confirmar com você. Apagar seus dados não cancela uma assinatura da loja; isso é feito na sua conta da loja.",
                                          "Obrigado. Passei seu pedido sobre dados para a equipe do app, que vai tratá-lo e confirmar com você. Apagar seus dados não cancela uma assinatura da loja."],
            "PRIVACY_REQUEST": ["Pedidos sobre dados são tratados pela equipe do {app_name}. Apagar seus dados não cancela uma assinatura da loja; isso é feito na sua conta da loja.",
                                "Pedidos sobre dados são tratados pela equipe do app. Apagar seus dados não cancela uma assinatura da loja."],
            "THIRD_PARTY_ACCOUNT": ["Só consigo ver a conta de onde vem esta mensagem, então não posso compartilhar nada sobre a assinatura de outra pessoa. Essa pessoa pode nos escrever pelo app na própria conta."],
            "DISCOUNT_REQUEST": ["Não consigo oferecer descontos nem tempo grátis, pois os preços são definidos pela loja."],
        },
        "extra": {
            "pending_grant": ["Seu pedido de extensão de cortesia ainda está em análise pela equipe. Ainda não está ativo, e você verá no app quando for aprovado."],
            "cannot_act": ["Não consigo cancelar por você. A assinatura só pode ser cancelada no seu próprio ID Apple ou conta Google."],
            "chargeback": ["Pedir reembolso pela loja costuma ser mais rápido que contestar no banco, e uma contestação pode fazer a loja bloquear sua conta."],
            "angry": ["Sinto muito que isso esteja sendo tão frustrante."],
        },
        "contra": {
            "charge_not_found": ["Não vejo uma cobrança assim na sua conta do {app_name}. Ela pode ter sido feita com outro ID Apple ou outra conta Google, ou por outro app. O histórico de compras da sua loja mostra quem cobrou.",
                                 "Não vejo uma cobrança assim nesta conta. Ela pode ter sido feita com outro ID Apple ou outra conta Google, ou por outro app. O histórico de compras da sua loja mostra quem cobrou."],
            "never_charged": ["Você nunca foi cobrado: o teste grátis terminou sem nenhum pagamento."],
        },
        "status": {
            "EXPIRED_BILLING_ERROR:never_charged": ["Seu teste grátis de {product_name} terminou em {expires_on} sem pagamento. {store_name} não conseguiu cobrar, então nada foi cobrado.",
                                                    "Seu teste grátis terminou sem pagamento, então nada foi cobrado."],
            "EXPIRED_CANCELLED:never_charged": ["Seu teste grátis de {product_name} foi cancelado e terminou em {expires_on}, então você nunca foi cobrado.",
                                                "Seu teste grátis foi cancelado e já terminou, então você nunca foi cobrado."],
        },
        "trial_first": [
            "Você está no teste grátis de {product_name}. Em {trial_ends_on} ele vira uma assinatura paga por {price_after_trial}, a menos que você cancele antes de {cancel_before}.",
            "Você está no teste grátis de {product_name}. Em {trial_ends_on} ele vira uma assinatura paga por {price_after_trial}, a menos que você cancele antes.",
            "Você está no teste grátis de {product_name}. Em {trial_ends_on} ele vira uma assinatura paga, a menos que você cancele antes de {cancel_before}.",
        ],
    },
    "ru": {
        "intent": {
            "HUMAN_REQUEST:escalated": ["Конечно, мы передали ваш разговор команде поддержки, и сотрудник ответит вам здесь."],
            "HUMAN_REQUEST": ["Я автоматическая помощь приложения; напишите, что случилось, и я сразу проверю ваш аккаунт."],
            "ACKNOWLEDGEMENT:thanks": ["Пожалуйста! Если появятся ещё вопросы о подписке, просто напишите сюда."],
            "ACKNOWLEDGEMENT": ["Чем помочь? Я могу объяснить вашу подписку, помочь её отменить, вернуть премиум на новом устройстве или показать, как запросить возврат."],
            "OTHER_APP": ["Я могу помочь только с подпиской {app_name}. По другому приложению обратитесь в его поддержку. В списке подписок вашего магазина видно, кто списывает деньги.",
                          "Я могу помочь только с подпиской этого приложения. По другому приложению обратитесь в его поддержку."],
            "PRIVACY_REQUEST:escalated": ["Спасибо, мы передали ваш запрос о данных команде {app_name}; они его обработают и подтвердят вам. Удаление данных не отменяет подписку в магазине. Это делается в вашем аккаунте магазина.",
                                          "Спасибо, мы передали ваш запрос о данных команде приложения; они его обработают и подтвердят вам. Удаление данных не отменяет подписку в магазине."],
            "PRIVACY_REQUEST": ["Запросы о данных обрабатывает команда {app_name}. Удаление данных не отменяет подписку в магазине. Это делается в вашем аккаунте магазина.",
                                "Запросы о данных обрабатывает команда приложения. Удаление данных не отменяет подписку в магазине."],
            "THIRD_PARTY_ACCOUNT": ["Я вижу только аккаунт, с которого пришло это сообщение, поэтому не могу рассказать о чужой подписке. Этот человек может написать нам из приложения со своего аккаунта."],
            "DISCOUNT_REQUEST": ["Я не могу предложить скидку или бесплатное время, потому что цены устанавливает магазин."],
        },
        "extra": {
            "pending_grant": ["Ваш запрос на продление доступа в качестве жеста доброй воли ещё у команды на рассмотрении. Пока он не действует, а после одобрения вы увидите это в приложении."],
            "cannot_act": ["Я не могу отменить подписку за вас. Это можно сделать только в вашем Apple ID или аккаунте Google."],
            "chargeback": ["Запрос на возврат через магазин обычно быстрее, чем оспаривание платежа в банке, а такое оспаривание может привести к блокировке вашего аккаунта в магазине."],
            "angry": ["Мне очень жаль, что это доставило столько неудобств."],
        },
        "contra": {
            "charge_not_found": ["Я не вижу такого списания в вашем аккаунте {app_name}. Возможно, оно было сделано с другого Apple ID или аккаунта Google либо другим приложением. В истории покупок магазина видно, кто списал деньги.",
                                 "Я не вижу такого списания в этом аккаунте. Возможно, оно было сделано с другого Apple ID или аккаунта Google либо другим приложением. В истории покупок магазина видно, кто списал деньги."],
            "never_charged": ["С вас никогда ничего не списывалось: бесплатный пробный период закончился без оплаты."],
        },
        "status": {
            "EXPIRED_BILLING_ERROR:never_charged": ["Ваш бесплатный пробный период {product_name} закончился {expires_on} без оплаты. {store_name} не удалось списать деньги, поэтому ничего не списано.",
                                                    "Ваш бесплатный пробный период закончился без оплаты, поэтому ничего не списано."],
            "EXPIRED_CANCELLED:never_charged": ["Ваш бесплатный пробный период {product_name} был отменён и закончился {expires_on}, поэтому с вас ничего не списывалось.",
                                                "Ваш бесплатный пробный период был отменён и закончился, поэтому с вас ничего не списывалось."],
        },
        "trial_first": [
            "У вас бесплатный пробный период {product_name}. {trial_ends_on} он перейдёт в платную подписку за {price_after_trial}, если не отменить его до {cancel_before}.",
            "У вас бесплатный пробный период {product_name}. Если не отменить его раньше, {trial_ends_on} он перейдёт в платную подписку за {price_after_trial}.",
            "У вас бесплатный пробный период {product_name}. {trial_ends_on} он перейдёт в платную подписку, если не отменить его до {cancel_before}.",
        ],
    },
}

TEMPLATES: dict[str, dict] = {"en": EN, "sr": SR, "es": ES, "de": DE, "pt": PT, "ru": RU}
for _lang, _add in ROUND2.items():
    _T = TEMPLATES[_lang]
    _T["intent"] = _add["intent"]
    _T["extra"] = _add["extra"]
    _T["contra"].update(_add["contra"])
    _T["status"].update(_add["status"])
    _T["status"]["TRIAL_ACTIVE"] = _add["trial_first"] + _T["status"]["TRIAL_ACTIVE"]


# =====================================================================================================================
# Serbian Latin -> Cyrillic (fixed text only; placeholders and brand names are protected)
# =====================================================================================================================
_LAT2CYR_DI = {"lj": "љ", "nj": "њ", "dž": "џ", "Lj": "Љ", "LJ": "Љ", "Nj": "Њ", "NJ": "Њ", "Dž": "Џ", "DŽ": "Џ"}
_LAT2CYR = dict(zip("abvgdđežzijklmnoprstćufhcčš", "абвгдђежзијклмнопрстћуфхцчш"))
_LAT2CYR.update({k.upper(): v.upper() for k, v in list(_LAT2CYR.items())})
_PROTECTED = re.compile(r"\{[a-z_]+\}|App Store|Google Play|Apple ID|Apple|Google|iPhone|Android|https?://\S+|"
                        r"[a-z0-9-]+(?:\.[a-z0-9-]+)+\.com")


def sr_lat_to_cyr(text: str) -> str:
    out, pos = [], 0
    for m in _PROTECTED.finditer(text):
        out.append(_translit_chunk(text[pos:m.start()]))
        out.append(m.group(0))
        pos = m.end()
    out.append(_translit_chunk(text[pos:]))
    return "".join(out)


def _translit_chunk(s: str) -> str:
    res, i = [], 0
    while i < len(s):
        two = s[i:i + 2]
        if two in _LAT2CYR_DI:
            res.append(_LAT2CYR_DI[two])
            i += 2
            continue
        res.append(_LAT2CYR.get(s[i], s[i]))
        i += 1
    return "".join(res)


# =====================================================================================================================
# Rendering
# =====================================================================================================================
_FMT = string.Formatter()


def _placeholders(tpl: str) -> list[str]:
    return [f for _, f, _, _ in _FMT.parse(tpl) if f]


def _pick(variants: V | None, fields: dict[str, str], cyr: bool) -> str | None:
    for tpl in variants or []:
        if all(fields.get(p) for p in _placeholders(tpl)):
            if cyr:
                tpl = sr_lat_to_cyr(tpl)
            return tpl.format_map({p: fields[p] for p in _placeholders(tpl)})
    return None


def _kind(a: Any) -> str:
    return str(a.get("kind") if isinstance(a, dict) else getattr(a, "kind", a))


def _params(a: Any) -> dict:
    p = a.get("params") if isinstance(a, dict) else getattr(a, "params", None)
    return p or {}


def template_lang(language: str | None) -> tuple[str, bool]:
    """(template language, cyrillic?) for a BCP-47 tag."""
    lang = (language or "en").replace("_", "-")
    base = lang.split("-")[0].lower()
    if base in ("sr", "hr", "bs", "sh", "cnr"):
        return "sr", ("cyrl" in lang.lower())
    return (base if base in TEMPLATES else "en"), False


_MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October",
              "November", "December"]
_ISO = re.compile(r"^(\d{4})-(\d{2})-(\d{2})$")
_PRICE = re.compile(r"^(\d+)\.(\d+) ([A-Z]{3})$")
# Contradiction sentences that would only repeat the status sentence for that state.
_REDUNDANT_CONTRA = {("LIFETIME", "one_time_purchase"), ("REFUNDED", "already_refunded"),
                     ("REFUNDED", "refund_ended_access"), ("NO_PURCHASE", "no_purchase_on_account"),
                     ("NO_PURCHASE", "no_charge_on_account"), ("TRIAL_CANCELLED", "nothing_charged")}


def localize_fields(fields: dict[str, str], lang: str) -> dict[str, str]:
    """Locale formatting that keeps every digit run inside facts.allowed_numbers: ISO dates become
    "27 November 2026" (en), "27.11.2026" (sr, de, ru), "27/11/2026" (es, pt); prices get a decimal comma outside en."""
    out = dict(fields)
    for k, v in fields.items():
        m = _ISO.match(v)
        if m:
            y, mo, d = m.groups()
            if lang == "en":
                out[k] = f"{int(d)} {_MONTHS_EN[int(mo) - 1]} {y}"
            elif lang in ("es", "pt"):
                out[k] = f"{d}/{mo}/{y}"
            else:
                out[k] = f"{d}.{mo}.{y}"
            continue
        m = _PRICE.match(v)
        if m and lang != "en":
            out[k] = f"{m.group(1)},{m.group(2)} {m.group(3)}"
    return out


# Intents whose reply is about something other than the subscription status: no status recap.
_NO_STATUS_INTENTS = {"ACKNOWLEDGEMENT", "OTHER_APP", "PRIVACY_REQUEST", "THIRD_PARTY_ACCOUNT", "HUMAN_REQUEST"}
# Intents where only the intent line (and a grant proposal) is said, whatever generic actions policy attached.
_LEAD_ONLY_INTENTS = {"ACKNOWLEDGEMENT", "OTHER_APP", "THIRD_PARTY_ACCOUNT"}
# Intents that still want the status even right after it was given.
_STATUS_AGAIN_INTENTS = {"STATUS_QUESTION", "PAID_NO_ACCESS"}
_TRIAL_STATES = {"TRIAL_ACTIVE", "TRIAL_CANCELLED"}


def _pending_grant(raw: dict[str, str]) -> bool:
    return (raw.get("grant_request", "").lower() == "pending"
            or raw.get("pending_grant", "").lower() in ("yes", "true", "pending", "1"))


def _last_assistant(history: Iterable[Any] | None) -> str | None:
    for h in reversed(list(history or [])):
        if isinstance(h, dict) and str(h.get("role")) == "assistant" and (h.get("text") or h.get("content")):
            return str(h.get("text") or h.get("content"))
    return None


_CHARGE_TOPICS = {"STATUS_QUESTION", "CHARGED_AFTER_CANCEL", "REFUND_REQUEST", "PAID_NO_ACCESS"}


def charge_claim_mismatch(claims: dict | None, facts: Any, intent_type: str | None = None) -> bool:
    """Deterministic stop-gap until the engine emits EXPLAIN_STATUS reason `charge_not_found`: the user names a store
    or an amount for a charge that does not match this account (store differs, or the amount is not any number in
    the FactSheet). Only typed claims are compared — never free text."""
    claims = claims or {}
    if intent_type not in _CHARGE_TOPICS or not (claims.get("claimed_store") or claims.get("claimed_amount")):
        return False
    raw = facts.get("fields", {}) if isinstance(facts, dict) else getattr(facts, "fields", {})
    allowed = facts.get("allowed_numbers", set()) if isinstance(facts, dict) else getattr(facts, "allowed_numbers", set())
    store = (raw or {}).get("store")
    cs = claims.get("claimed_store")
    if cs in ("app_store", "play_store") and store in ("app_store", "play_store") and cs != store:
        return True
    amt = claims.get("claimed_amount")
    if amt and (raw or {}).get("price"):
        variants = {amt, amt.replace(".", ","), amt.split(".")[0] if amt.endswith(".00") else amt}
        if not variants & {str(x) for x in (allowed or set())}:
            return True
    return False


def render(state: Any, actions: Iterable[Any] | None, facts: Any, language: str | None = "en",
           intent_type: str | None = None, claims: dict | None = None, history: Iterable[Any] | None = None) -> str:
    """Deterministic reply. `state` may be a CaseState or a state code string; `facts` a FactSheet or dict.
    `claims` = sanitised intent claims (booleans/enums only); `history` = earlier turns (used to avoid repeating
    the status that was just given)."""
    code = str(getattr(state, "code", state) or "NO_PURCHASE")
    raw = facts.get("fields", {}) if isinstance(facts, dict) else getattr(facts, "fields", {})
    raw = {k: str(v) for k, v in (raw or {}).items() if v not in (None, "")}
    lang, cyr = template_lang(language)
    fields = localize_fields(raw, lang)
    T = TEMPLATES[lang]
    actions = list(actions or [])
    kinds = [_kind(a) for a in actions]
    store = raw.get("store") or ""
    claims = claims or {}
    itype = intent_type or ""
    prev = _last_assistant(history)
    escalated = "ESCALATE_TO_HUMAN" in kinds
    never_charged = raw.get("ever_charged", "").lower() == "no"

    parts: list[str] = []
    if claims.get("angry"):
        parts.append(_pick(T["extra"]["angry"], fields, cyr) or "")

    # 1. intent lead line
    lead_key = itype
    if itype in ("HUMAN_REQUEST", "PRIVACY_REQUEST") and escalated:
        lead_key = f"{itype}:escalated"
    elif itype == "ACKNOWLEDGEMENT" and claims.get("thanks"):
        lead_key = "ACKNOWLEDGEMENT:thanks"
    lead = _pick(T["intent"].get(lead_key), fields, cyr)
    if lead:
        parts.append(lead)

    # 2. correction / acknowledgement of the user's claim
    explain = next((a for a in actions if _kind(a) == "EXPLAIN_STATUS"), None)
    contradicted = explain is not None and bool(_params(explain).get("claim_contradicted"))
    reason = (_params(explain).get("reason") if explain is not None else None) or "claim_does_not_match"
    if (reason == "charge_not_found" or charge_claim_mismatch(claims, facts, itype)) and itype not in _LEAD_ONLY_INTENTS:
        s = _pick(T["contra"]["charge_not_found"], fields, cyr)
        if s:
            parts.append(s)
        contradicted = True
    elif contradicted and itype not in _LEAD_ONLY_INTENTS:
        if reason == "nothing_charged" and code not in _TRIAL_STATES:
            reason = "never_charged"
        if (code, reason) not in _REDUNDANT_CONTRA:
            s = _pick(T["contra"].get(reason) or T["contra"]["claim_does_not_match"], fields, cyr)
            if s:
                parts.append(s)
    elif (itype == "CHARGED_AFTER_CANCEL" and raw.get("cancelled_on") and raw.get("last_charged_on")
          and raw["last_charged_on"] > raw["cancelled_on"]):
        s = _pick(T["ack"]["charged_after_cancel"], fields, cyr)
        if s:
            parts.append(s)

    # 3. status — not for off-topic intents, and not again right after it was given
    status_key = f"{code}:never_charged" if never_charged and f"{code}:never_charged" in T["status"] else code
    status = _pick(T["status"].get(status_key) or T["status"]["NO_PURCHASE"], fields, cyr)
    skip_status = (itype in _NO_STATUS_INTENTS
                   or (prev is not None and itype not in _STATUS_AGAIN_INTENTS and not contradicted)
                   or (prev is not None and status is not None and status in prev and itype != "STATUS_QUESTION"))
    if status and (explain is not None or not actions) and not skip_status:
        parts.append(status)

    # 4. one sentence per decided action
    seen: set[str] = set()
    for a in actions:
        k = _kind(a)
        if k == "EXPLAIN_STATUS":
            continue
        if itype in _LEAD_ONLY_INTENTS and k != "PROPOSE_GRANT":
            continue
        if k == "ESCALATE_TO_HUMAN" and lead_key.endswith(":escalated"):
            continue  # the lead line already says it
        if k == "MANAGE_SUBSCRIPTION_LINK" and "CANCEL_STEPS" in kinds:
            continue  # the cancel sentence carries the link
        key = k
        if k == "ESCALATE_TO_HUMAN" and str(_params(a).get("reason", "")).startswith("no_store_self_service"):
            key = "ESCALATE_TO_HUMAN:no_store"
        elif k == "RESTORE_PURCHASES_STEPS":
            hint = {"ios": "app_store", "android": "play_store"}.get(str(claims.get("claimed_platform", "")))
            if _params(a).get("steps_key") == "restore_generic" and not hint:
                key = k
            elif hint:
                key = f"{k}:{hint}"
            elif f"{k}:{store}" in T["action"]:
                key = f"{k}:{store}"
        elif f"{k}:{store}" in T["action"]:
            key = f"{k}:{store}"
        if key in seen or (key.startswith("ESCALATE_TO_HUMAN") and any(x.startswith("ESCALATE_TO_HUMAN") for x in seen)):
            continue
        seen.add(key)
        if k == "CANCEL_STEPS" and claims.get("wants_agent_to_act"):
            parts.append(_pick(T["extra"]["cannot_act"], fields, cyr) or "")
        s = _pick(T["action"].get(key) or T["action"].get(k), fields, cyr)
        if s:
            parts.append(s)

    # 5. standing facts the user must not lose track of
    if _pending_grant(raw) and "PROPOSE_GRANT" not in kinds:
        parts.append(_pick(T["extra"]["pending_grant"], fields, cyr) or "")
    if claims.get("chargeback_threat"):
        parts.append(_pick(T["extra"]["chargeback"], fields, cyr) or "")

    parts = [p for p in parts if p]
    if not parts or parts == [_pick(T["extra"]["angry"], fields, cyr)]:
        parts.append(status or "")
    return " ".join(p for p in parts if p).strip()


def all_keys() -> dict[str, list[str]]:
    """Every template key per section (tests use it to check that all languages are complete)."""
    return {sec: sorted(EN[sec]) for sec in ("ack", "status", "contra", "action", "intent", "extra")}
