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
            "Your {product_name} subscription is cancelled, so it won't renew — you keep full access until {expires_on}.",
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
        "not_cancelled": ["I don't see a cancellation on this subscription — it's still set to renew."],
        "nothing_charged": ["Nothing has been charged for this — you're on the free trial."],
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
            "The last charge was on {last_charged_on} and you turned off renewal on {cancelled_on}, after that charge — so nothing was charged after you cancelled.",
            "The last charge happened before you cancelled — nothing was charged after you cancelled.",
        ],
        "no_cancellation_recorded": ["I can't see any charge after your cancellation on this account."],
    },
    "action": {
        "MANAGE_SUBSCRIPTION_LINK": ["Your subscription page is {manage_url} — you can see and change it there.",
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
            "Refunds for App Store purchases are decided by Apple, not by us — you can request one at {refund_url}.",
            "Refunds for App Store purchases are decided by Apple, not by us — you can request one at reportaproblem.apple.com.",
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
            "I've asked the team to review a {grant_days}-day courtesy extension of your access. It isn't active yet — it only starts if they approve it.",
            "I've asked the team to review a short courtesy extension of your access. It isn't active yet — it only starts if they approve it.",
        ],
        "ESCALATE_TO_HUMAN": ["I've passed this to our support team, and a person will get back to you here."],
        "ESCALATE_TO_HUMAN:no_store": ["This purchase isn't managed through the App Store or Google Play, so I've passed it to our support team — a person will get back to you here."],
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
            "Vaša pretplata {product_name} je otkazana i neće se obnoviti — pun pristup imate do {expires_on}.",
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
        "not_cancelled": ["Ne vidim da je ova pretplata otkazana — i dalje je podešena da se obnavlja."],
        "nothing_charged": ["Za ovo vam ništa nije naplaćeno — koristite besplatni probni period."],
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
            "Poslednja naplata je bila {last_charged_on}, a obnovu ste isključili {cancelled_on}, posle te naplate — tako da posle otkazivanja ništa nije naplaćeno.",
            "Poslednja naplata je bila pre vašeg otkazivanja — posle otkazivanja ništa nije naplaćeno.",
        ],
        "no_cancellation_recorded": ["Na ovom nalogu ne vidim naplatu posle vašeg otkazivanja."],
    },
    "action": {
        "MANAGE_SUBSCRIPTION_LINK": ["Stranica vaše pretplate je {manage_url} — tamo je možete pogledati i menjati.",
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
            "O povraćaju novca za kupovine u App Store-u odlučuje Apple, a ne mi — zahtev možete poslati na {refund_url}.",
            "O povraćaju novca za kupovine u App Store-u odlučuje Apple, a ne mi — zahtev možete poslati na reportaproblem.apple.com.",
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
            "Poslali smo timu zahtev da razmotri produženje vašeg pristupa za {grant_days} dana, kao gest dobre volje. Još nije aktivno — počinje samo ako ga odobre.",
            "Poslali smo timu zahtev da razmotri kratko produženje vašeg pristupa, kao gest dobre volje. Još nije aktivno — počinje samo ako ga odobre.",
        ],
        "ESCALATE_TO_HUMAN": ["Prosledili smo vaš slučaj našem timu podrške i neko od njih će vam odgovoriti ovde."],
        "ESCALATE_TO_HUMAN:no_store": ["Ova kupovina nije preko App Store-a ni Google Play-a, pa smo vaš slučaj prosledili našem timu podrške — neko od njih će vam odgovoriti ovde."],
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
    "ack": {"charged_after_cancel": ["Du hast recht: Du hast die Verlängerung am {cancelled_on} ausgeschaltet, und am {last_charged_on} wurde trotzdem abgebucht.", "Du hast recht: Nach dem Ausschalten der Verlängerung wurde trotzdem abgebucht."]},
    "status": {
        "ACTIVE_RENEWING": [
            "Dein Abo {product_name} ({store_name}) ist aktiv und verlängert sich am {renews_on} für {price}.",
            "Dein Abo {product_name} ({store_name}) ist aktiv und verlängert sich am {renews_on}.",
            "Dein Abo {product_name} ist aktiv und verlängert sich automatisch.",
            "Dein Abo ist aktiv und verlängert sich automatisch.",
        ],
        "CANCELLED_PAID_UP": [
            "Dein Abo {product_name} ist gekündigt und verlängert sich nicht – du hast vollen Zugang bis zum {expires_on}.",
            "Dein Abo {product_name} ist gekündigt und verlängert sich nicht.",
            "Dein Abo ist gekündigt und verlängert sich nicht.",
        ],
        "TRIAL_ACTIVE": [
            "Du nutzt gerade die kostenlose Testphase von {product_name}. Am {trial_ends_on} wird daraus ein bezahltes Abo für {price}, wenn du nicht vorher kündigst.",
            "Du nutzt gerade die kostenlose Testphase von {product_name}. Am {trial_ends_on} wird daraus ein bezahltes Abo, wenn du nicht vorher kündigst.",
            "Du nutzt gerade die kostenlose Testphase von {product_name}; ohne Kündigung wird daraus ein bezahltes Abo.",
            "Du nutzt gerade eine kostenlose Testphase; ohne Kündigung wird daraus ein bezahltes Abo.",
        ],
        "TRIAL_CANCELLED": [
            "Deine kostenlose Testphase von {product_name} ist gekündigt, dir wird also nichts berechnet. Du kannst sie bis zum {trial_ends_on} weiter nutzen.",
            "Deine kostenlose Testphase von {product_name} ist gekündigt, dir wird also nichts berechnet. Du kannst sie bis zum {expires_on} weiter nutzen.",
            "Deine kostenlose Testphase von {product_name} ist gekündigt, dir wird also nichts berechnet.",
            "Deine kostenlose Testphase ist gekündigt, dir wird also nichts berechnet.",
        ],
        "GRACE_PERIOD": [
            "{store_name} konnte die Zahlung für {product_name} nicht einziehen (erster Fehlversuch am {billing_issue_on}). Solange es erneut versucht wird, behältst du den Zugang – bis zum {grace_ends_on}.",
            "{store_name} konnte die Zahlung für {product_name} nicht einziehen. Solange es erneut versucht wird, behältst du vorerst den Zugang.",
            "Der Store konnte deine letzte Zahlung nicht einziehen. Solange es erneut versucht wird, behältst du vorerst den Zugang.",
        ],
        "BILLING_RETRY": [
            "{store_name} konnte die Verlängerung von {product_name} nicht abbuchen (seit {billing_issue_on}), daher ist Premium pausiert, während der Store es erneut versucht.",
            "{store_name} konnte die Verlängerung von {product_name} nicht abbuchen, daher ist Premium pausiert, während der Store es erneut versucht.",
            "Der Store konnte die Verlängerung nicht abbuchen, daher ist Premium pausiert, während er es erneut versucht.",
        ],
        "EXPIRED_BILLING_ERROR": [
            "Dein Abo {product_name} ist am {expires_on} abgelaufen, weil {store_name} die Verlängerung nicht abbuchen konnte.",
            "Dein Abo {product_name} ist abgelaufen, weil der Store die Verlängerung nicht abbuchen konnte.",
            "Dein Abo ist abgelaufen, weil der Store die Verlängerung nicht abbuchen konnte.",
        ],
        "EXPIRED_CANCELLED": [
            "Dein Abo {product_name} wurde gekündigt und ist am {expires_on} abgelaufen – es ist nicht mehr aktiv und verlängert sich nicht.",
            "Dein Abo {product_name} wurde gekündigt und ist abgelaufen, es verlängert sich also nicht.",
            "Dein Abo wurde gekündigt und ist abgelaufen, es verlängert sich also nicht.",
        ],
        "REFUNDED": [
            "Der Kauf von {product_name} wurde am {refunded_on} erstattet, deshalb ist dieses Abo nicht mehr aktiv.",
            "Der Kauf von {product_name} wurde erstattet, deshalb ist dieses Abo nicht mehr aktiv.",
            "Dieser Kauf wurde erstattet, deshalb ist das Abo nicht mehr aktiv.",
        ],
        "LIFETIME": [
            "Du hast lebenslangen Zugang zu {product_name}: Es ist ein Einmalkauf, also gibt es keine Verlängerung und keine weiteren Abbuchungen.",
            "Du hast lebenslangen Zugang: Es ist ein Einmalkauf, also gibt es keine Verlängerung und keine weiteren Abbuchungen.",
        ],
        "GRANTED_BY_DEVELOPER": [
            "Dein Zugang zu {product_name} ist ein Geschenk des App-Teams und gilt bis zum {granted_until}. Es ist kein bezahltes Abo, dir wird also nichts berechnet.",
            "Dein Zugang zu {product_name} ist ein Geschenk des App-Teams und gilt bis zum {expires_on}. Es ist kein bezahltes Abo, dir wird also nichts berechnet.",
            "Dein Zugang ist ein Geschenk des App-Teams. Es ist kein bezahltes Abo, dir wird also nichts berechnet.",
        ],
        "NO_PURCHASE": [
            "Ich finde auf diesem Konto keinen Kauf. Wenn du mit einer anderen Apple-ID oder einem anderen Google-Konto bezahlt hast, ist der Kauf mit diesem Konto verknüpft.",
        ],
        "FAMILY_SHARED": [
            "Dein Zugang zu {product_name} kommt über die Familienfreigabe – Abo und Abrechnung gehören zum Konto des Familienorganisators, nicht zu deinem.",
            "Dein Zugang kommt über die Familienfreigabe – Abo und Abrechnung gehören zum Konto des Familienorganisators, nicht zu deinem.",
        ],
    },
    "contra": {
        "not_cancelled": ["Ich sehe keine Kündigung für dieses Abo – es ist weiterhin auf Verlängerung eingestellt."],
        "nothing_charged": ["Dafür wurde dir nichts berechnet – du bist in der kostenlosen Testphase."],
        "renewal_charge_failed": ["Die Abbuchung für die Verlängerung ist fehlgeschlagen, ein neuer Zeitraum wurde dir also nicht berechnet."],
        "already_refunded": ["Dieser Kauf wurde bereits erstattet."],
        "one_time_purchase": ["Lebenslanger Zugang ist ein Einmalkauf, es gibt keine wiederkehrenden Abbuchungen."],
        "no_charge_on_account": ["Ich sehe auf diesem Konto keine Abo-Abbuchung."],
        "organizer_pays": ["Abbuchungen der Familienfreigabe gehen an den Familienorganisator, nicht an dein Konto."],
        "refund_ended_access": ["Der Zugang ist beendet, weil der Kauf erstattet wurde."],
        "period_ended": ["Dein bezahlter Zeitraum ist abgelaufen, deshalb ist Premium jetzt gesperrt."],
        "no_purchase_on_account": ["Ich sehe auf diesem Konto noch keinen Kauf."],
        "organizer_must_request": ["Nur der Familienorganisator, der bezahlt hat, kann beim Store eine Erstattung anfragen."],
        "payment_ok": ["Bei deinem Abo gibt es gerade kein Zahlungsproblem."],
        "has_access": ["Dein Konto hat gerade Premium-Zugang."],
        "claim_does_not_match": ["Auf deinem Konto sieht es etwas anders aus."],
        "charged_before_cancel": [
            "Die letzte Abbuchung war am {last_charged_on}, gekündigt hast du am {cancelled_on}, also nach dieser Abbuchung – nach der Kündigung wurde nichts mehr abgebucht.",
            "Die letzte Abbuchung war vor deiner Kündigung – danach wurde nichts mehr abgebucht.",
        ],
        "no_cancellation_recorded": ["Auf diesem Konto sehe ich keine Abbuchung nach deiner Kündigung."],
    },
    "action": {
        "MANAGE_SUBSCRIPTION_LINK": ["Deine Abo-Seite ist {manage_url} – dort kannst du es ansehen und ändern.",
                                     "Du kannst dein Abo in den Abo-Einstellungen deines Store-Kontos verwalten."],
        "CANCEL_STEPS:app_store": [
            "So kündigst du: Öffne die Einstellungen auf dem iPhone, tippe auf deinen Namen, dann auf Abonnements, wähle {product_name} und tippe auf Abo kündigen ({manage_url}).",
            "So kündigst du: Öffne die Einstellungen auf dem iPhone, tippe auf deinen Namen, dann auf Abonnements, wähle das Abo und tippe auf Abo kündigen.",
        ],
        "CANCEL_STEPS:play_store": [
            "So kündigst du: Öffne Google Play, tippe auf dein Profilbild, dann Zahlungen & Abos > Abos, wähle {product_name} und tippe auf Kündigen ({manage_url}).",
            "So kündigst du: Öffne Google Play, tippe auf dein Profilbild, dann Zahlungen & Abos > Abos, wähle das Abo und tippe auf Kündigen.",
        ],
        "CANCEL_STEPS": ["Zum Kündigen schalte die Verlängerung auf der Abo-Seite des Stores aus, in dem du abgeschlossen hast."],
        "REFUND_PATH_APPLE": [
            "Über Erstattungen für App-Store-Käufe entscheidet Apple, nicht wir – du kannst sie unter {refund_url} beantragen.",
            "Über Erstattungen für App-Store-Käufe entscheidet Apple, nicht wir – du kannst sie unter reportaproblem.apple.com beantragen.",
        ],
        "REFUND_PATH_GOOGLE": [
            "Du kannst eine Erstattung über Google Play unter {refund_url} beantragen; Google prüft die Anfrage.",
            "Du kannst eine Erstattung im Bestellverlauf von Google Play beantragen; Google prüft die Anfrage.",
        ],
        "RESTORE_PURCHASES_STEPS:app_store": ["Melde dich auf dem neuen Gerät mit derselben Apple-ID an, mit der du gekauft hast, öffne die App und tippe in ihren Einstellungen auf Käufe wiederherstellen."],
        "RESTORE_PURCHASES_STEPS:play_store": ["Melde dich auf dem neuen Gerät mit demselben Google-Konto an, mit dem du gekauft hast, öffne die App und tippe in ihren Einstellungen auf Käufe wiederherstellen."],
        "RESTORE_PURCHASES_STEPS": ["Melde dich mit demselben Store-Konto an, mit dem du gekauft hast, öffne die App und tippe in ihren Einstellungen auf Käufe wiederherstellen."],
        "UPDATE_PAYMENT_METHOD:app_store": [
            "Bitte aktualisiere deine Zahlungsmethode in deinem Apple-Konto: {payment_url} (oder Einstellungen > dein Name > Zahlung & Versand). Danach versucht der Store die Abbuchung erneut.",
            "Bitte aktualisiere deine Zahlungsmethode unter Einstellungen > dein Name > Zahlung & Versand. Danach versucht der Store die Abbuchung erneut.",
        ],
        "UPDATE_PAYMENT_METHOD:play_store": [
            "Bitte aktualisiere deine Zahlungsmethode in Google Play: {payment_url}. Danach versucht der Store die Abbuchung erneut.",
            "Bitte aktualisiere deine Zahlungsmethode in Google Play > Zahlungen & Abos. Danach versucht der Store die Abbuchung erneut.",
        ],
        "UPDATE_PAYMENT_METHOD": ["Bitte aktualisiere deine Zahlungsmethode in dem Store, in dem du abgeschlossen hast."],
        "PROPOSE_GRANT": [
            "Ich habe das Team gebeten, eine Verlängerung deines Zugangs um {grant_days} Tage aus Kulanz zu prüfen. Sie ist noch nicht aktiv – sie startet nur, wenn das Team zustimmt.",
            "Ich habe das Team gebeten, eine kurze Verlängerung deines Zugangs aus Kulanz zu prüfen. Sie ist noch nicht aktiv – sie startet nur, wenn das Team zustimmt.",
        ],
        "ESCALATE_TO_HUMAN": ["Ich habe deinen Fall an unser Support-Team weitergegeben, eine Person meldet sich hier bei dir."],
        "ESCALATE_TO_HUMAN:no_store": ["Dieser Kauf lief nicht über den App Store oder Google Play, deshalb habe ich deinen Fall an unser Support-Team weitergegeben – eine Person meldet sich hier bei dir."],
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
            "Sua assinatura {product_name} está cancelada e não vai renovar — você mantém o acesso completo até {expires_on}.",
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
        "not_cancelled": ["Não vejo nenhum cancelamento nesta assinatura — ela continua configurada para renovar."],
        "nothing_charged": ["Nada foi cobrado por isso — você está no teste grátis."],
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
            "A última cobrança foi em {last_charged_on} e você desativou a renovação em {cancelled_on}, depois dessa cobrança — então nada foi cobrado após o cancelamento.",
            "A última cobrança foi antes do seu cancelamento — depois dele, nada foi cobrado.",
        ],
        "no_cancellation_recorded": ["Não vejo nenhuma cobrança depois do seu cancelamento nesta conta."],
    },
    "action": {
        "MANAGE_SUBSCRIPTION_LINK": ["A página da sua assinatura é {manage_url} — lá você pode ver e alterar.",
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
            "Reembolsos de compras na App Store são decididos pela Apple, não por nós — você pode solicitar em {refund_url}.",
            "Reembolsos de compras na App Store são decididos pela Apple, não por nós — você pode solicitar em reportaproblem.apple.com.",
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
            "Pedi à equipe que analise uma extensão de cortesia de {grant_days} dias para o seu acesso. Ainda não está ativa — só começa se for aprovada.",
            "Pedi à equipe que analise uma breve extensão de cortesia para o seu acesso. Ainda não está ativa — só começa se for aprovada.",
        ],
        "ESCALATE_TO_HUMAN": ["Passei seu caso para a nossa equipe de suporte, e uma pessoa vai responder aqui."],
        "ESCALATE_TO_HUMAN:no_store": ["Esta compra não foi feita pela App Store nem pelo Google Play, então passei seu caso para a nossa equipe de suporte — uma pessoa vai responder aqui."],
    },
}

# =====================================================================================================================
# Russian
# =====================================================================================================================
RU = {
    "ack": {"charged_after_cancel": ["Вы правы: продление вы отключили {cancelled_on}, но {last_charged_on} всё равно прошло списание.", "Вы правы: списание прошло уже после того, как вы отключили продление."]},
    "status": {
        "ACTIVE_RENEWING": [
            "Ваша подписка {product_name} ({store_name}) активна; следующее продление — {renews_on}, стоимость — {price}.",
            "Ваша подписка {product_name} ({store_name}) активна; следующее продление — {renews_on}.",
            "Ваша подписка {product_name} активна и продлевается автоматически.",
            "Ваша подписка активна и продлевается автоматически.",
        ],
        "CANCELLED_PAID_UP": [
            "Ваша подписка {product_name} отменена и не продлится — полный доступ сохраняется до {expires_on}.",
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
            "{store_name} не удалось списать оплату за {product_name} (первая неудачная попытка — {billing_issue_on}). Пока оплата повторяется, доступ сохраняется — до {grace_ends_on}.",
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
            "Ваш доступ к {product_name} — подарок от команды приложения, он действует до {granted_until}. Это не платная подписка, поэтому ничего списано не будет.",
            "Ваш доступ к {product_name} — подарок от команды приложения, он действует до {expires_on}. Это не платная подписка, поэтому ничего списано не будет.",
            "Ваш доступ — подарок от команды приложения. Это не платная подписка, поэтому ничего списано не будет.",
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
        "not_cancelled": ["Я не вижу отмены этой подписки — она по-прежнему продлевается автоматически."],
        "nothing_charged": ["За это ничего не списывалось — у вас бесплатный пробный период."],
        "renewal_charge_failed": ["Списание за продление не прошло, поэтому новый период не оплачен."],
        "already_refunded": ["За эту покупку уже был сделан возврат."],
        "one_time_purchase": ["Пожизненный доступ — это разовая покупка, регулярных списаний нет."],
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
            "Последнее списание было {last_charged_on}, а продление вы отключили {cancelled_on}, уже после него — поэтому после отмены ничего не списывалось.",
            "Последнее списание было до вашей отмены — после неё ничего не списывалось.",
        ],
        "no_cancellation_recorded": ["Я не вижу списаний после вашей отмены в этом аккаунте."],
    },
    "action": {
        "MANAGE_SUBSCRIPTION_LINK": ["Страница вашей подписки — {manage_url}: там её можно посмотреть и изменить.",
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
            "Решение о возврате за покупки в App Store принимает Apple, а не мы — запросить возврат можно на {refund_url}.",
            "Решение о возврате за покупки в App Store принимает Apple, а не мы — запросить возврат можно на reportaproblem.apple.com.",
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
            "Мы попросили команду рассмотреть продление вашего доступа в качестве жеста доброй воли (дней: {grant_days}). Оно пока не действует — начнётся, только если его одобрят.",
            "Мы попросили команду рассмотреть короткое продление вашего доступа в качестве жеста доброй воли. Оно пока не действует — начнётся, только если его одобрят.",
        ],
        "ESCALATE_TO_HUMAN": ["Мы передали ваш вопрос нашей команде поддержки — сотрудник ответит вам здесь."],
        "ESCALATE_TO_HUMAN:no_store": ["Эта покупка сделана не через App Store или Google Play, поэтому мы передали ваш вопрос команде поддержки — сотрудник ответит вам здесь."],
    },
}

TEMPLATES: dict[str, dict] = {"en": EN, "sr": SR, "es": ES, "de": DE, "pt": PT, "ru": RU}

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


def render(state: Any, actions: Iterable[Any] | None, facts: Any, language: str | None = "en",
           intent_type: str | None = None) -> str:
    """Deterministic reply. `state` may be a CaseState or a state code string; `facts` a FactSheet or dict."""
    code = str(getattr(state, "code", state) or "NO_PURCHASE")
    raw = facts.get("fields", {}) if isinstance(facts, dict) else getattr(facts, "fields", {})
    raw = {k: str(v) for k, v in (raw or {}).items() if v not in (None, "")}
    lang, cyr = template_lang(language)
    fields = localize_fields(raw, lang)
    T = TEMPLATES[lang]
    actions = list(actions or [])
    kinds = [_kind(a) for a in actions]
    store = raw.get("store") or ""

    parts: list[str] = []
    explain = next((a for a in actions if _kind(a) == "EXPLAIN_STATUS"), None)
    contradicted = explain is not None and bool(_params(explain).get("claim_contradicted"))
    if contradicted:
        reason = _params(explain).get("reason") or "claim_does_not_match"
        if (code, reason) not in _REDUNDANT_CONTRA:
            s = _pick(T["contra"].get(reason) or T["contra"]["claim_does_not_match"], fields, cyr)
            if s:
                parts.append(s)
    elif (intent_type == "CHARGED_AFTER_CANCEL" and raw.get("cancelled_on") and raw.get("last_charged_on")
          and raw["last_charged_on"] > raw["cancelled_on"]):
        s = _pick(T["ack"]["charged_after_cancel"], fields, cyr)
        if s:
            parts.append(s)
    if explain is not None or not actions:
        s = _pick(T["status"].get(code) or T["status"]["NO_PURCHASE"], fields, cyr)
        if s:
            parts.append(s)

    seen: set[str] = set()
    for a in actions:
        k = _kind(a)
        if k == "EXPLAIN_STATUS":
            continue
        if k == "MANAGE_SUBSCRIPTION_LINK" and "CANCEL_STEPS" in kinds:
            continue  # the cancel sentence carries the link
        key = k
        if k == "ESCALATE_TO_HUMAN" and str(_params(a).get("reason", "")).startswith("no_store_self_service"):
            key = "ESCALATE_TO_HUMAN:no_store"
        elif f"{k}:{store}" in T["action"]:
            key = f"{k}:{store}"
        if key in seen or (key.startswith("ESCALATE_TO_HUMAN") and any(x.startswith("ESCALATE_TO_HUMAN") for x in seen)):
            continue
        seen.add(key)
        s = _pick(T["action"].get(key) or T["action"].get(k), fields, cyr)
        if s:
            parts.append(s)
    return " ".join(parts).strip()


def all_keys() -> dict[str, list[str]]:
    """Every template key per section (tests use it to check that all languages are complete)."""
    return {sec: sorted(EN[sec]) for sec in ("ack", "status", "contra", "action")}
