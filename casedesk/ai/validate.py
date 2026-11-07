"""Reply validator: the guard between the LLM and the user (ARCH non-negotiable 1).

``check(text, facts, actions, state) -> list[str]`` returns violation strings (empty list = the reply may be sent):

  unsupported_number:<tok>   a digit sequence / date / price / percentage that is not in facts.allowed_numbers
  refund_promise[:app_store] a promise or claim that a refund will be / was issued (any store; App Store tagged)
  claimed_action:<what>      says something was done that is not in the decided actions (granted, restored,
                             cancelled, payment updated, escalated)
  unknown_url:<url>          a URL / domain / e-mail not present in the FactSheet
  grant_stated_as_done       PROPOSE_GRANT phrased as granted / promised
  grant_not_framed_as_request PROPOSE_GRANT present but the text never says it was requested / will be reviewed
  grant_mentioned_without_action  talks about a courtesy extension although no PROPOSE_GRANT was decided
  too_long:<n>               more than 90 words
  template_placeholder       an unfilled {placeholder}

Patterns cover en, sr (Latin + Cyrillic, via transliteration), es, de, pt, fr, it, ru. They run on lowercased,
accent-folded text, so they are written without diacritics (except Russian).
"""
from __future__ import annotations

import re
from typing import Any, Iterable

from casedesk.ai.intent import _norm

MAX_WORDS = 90


def _code(state: Any) -> str:
    return str(getattr(state, "code", state) or "")


def _kinds(actions: Iterable[Any] | None) -> set[str]:
    out = set()
    for a in actions or []:
        k = a.get("kind") if isinstance(a, dict) else getattr(a, "kind", a)
        out.add(str(k))
    return out


def _fields(facts: Any) -> dict[str, str]:
    f = facts.get("fields", {}) if isinstance(facts, dict) else getattr(facts, "fields", {})
    return {str(k): str(v) for k, v in (f or {}).items() if v is not None}


def _allowed(facts: Any) -> set[str]:
    a = facts.get("allowed_numbers", set()) if isinstance(facts, dict) else getattr(facts, "allowed_numbers", set())
    return {str(x) for x in (a or [])}


# ---------------------------------------------------------------------------------------------------------------------
# URLs
# ---------------------------------------------------------------------------------------------------------------------
_URL_RE = re.compile(r"https?://[^\s<>()\"'\]\[]+", re.I)
_TLDS = r"(?:com|net|org|io|app|co|me|info|biz|ru|rs|de|es|fr|it|pt|br|ly|gl|link|support|help|eu|uk|us)"
_DOMAIN_RE = re.compile(r"(?<![@\w.-])(?:www\.)?(?:[a-z0-9-]+\.)+" + _TLDS + r"\b(?:/[^\s<>()\"']*)?", re.I)
_EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+", re.I)
_TRAIL = ".,;:!?)»\"'”’]"


def _clean_url(u: str) -> str:
    u = u.rstrip(_TRAIL)
    return u


def _canon(u: str) -> str:
    u = _clean_url(u).lower()
    u = re.sub(r"^https?://", "", u)
    u = re.sub(r"^www\.", "", u)
    return u.rstrip("/")


def allowed_urls(facts: Any) -> set[str]:
    out = set()
    for v in _fields(facts).values():
        for u in _URL_RE.findall(v):
            out.add(_canon(u))
    return out


def _check_urls(text: str, facts: Any) -> tuple[list[str], str]:
    """Returns (violations, text with all URLs/domains/e-mails blanked out for the number check)."""
    allowed = allowed_urls(facts)
    violations: list[str] = []
    for m in _EMAIL_RE.findall(text):
        violations.append(f"unknown_url:{m}")
    text = _EMAIL_RE.sub(" ", text)
    for u in _URL_RE.findall(text):
        if _canon(u) not in allowed:
            violations.append(f"unknown_url:{_clean_url(u)}")
    text = _URL_RE.sub(" ", text)
    for d in _DOMAIN_RE.findall(text):
        if _canon(d) not in allowed:
            violations.append(f"unknown_url:{_clean_url(d)}")
    text = _DOMAIN_RE.sub(" ", text)
    return violations, text


# ---------------------------------------------------------------------------------------------------------------------
# Numbers
# ---------------------------------------------------------------------------------------------------------------------
_NUM_TOKEN = re.compile(r"\d+(?:[.,:/\-]\d+)*")
_ISO_DATE = re.compile(r"^\d{4}-\d{1,2}-\d{1,2}$")


def _check_numbers(text: str, facts: Any) -> list[str]:
    allowed = _allowed(facts)
    allowed_norm = allowed | {a.replace(",", ".") for a in allowed} | {a.replace(".", ",") for a in allowed}
    runs: set[str] = set()
    for a in allowed:
        for r in re.findall(r"\d+", a):
            runs.add(r)
            runs.add(r.lstrip("0") or "0")
    out: list[str] = []
    for tok in _NUM_TOKEN.findall(text):
        if tok in allowed_norm:
            continue
        parts = re.findall(r"\d+", tok)
        if _ISO_DATE.match(tok):
            ok = False  # a full ISO date must match exactly
        elif len(parts) == 2 and re.fullmatch(r"\d+[.,]\d+", tok):
            ok = False  # price / decimal: exact only
        else:
            ok = all((p in runs) or ((p.lstrip("0") or "0") in runs) for p in parts)
        if not ok:
            out.append(f"unsupported_number:{tok}")
    return out


# ---------------------------------------------------------------------------------------------------------------------
# Refund promises (all 8 languages)
# ---------------------------------------------------------------------------------------------------------------------
_REFUND_PROMISE = [
    # en
    r"\b(we|i)('ll| will| shall| are going to|'re going to| am going to|'m going to) (\w+ )?(refund|reimburse)",
    r"\b(we|i)('ve| have)? (already )?(issued|processed|sent|initiated|approved|started|made) (you |your )?(a |the |your |full )?refund",
    r"\b(we|i)('ve| have)? (already )?(refunded|reimbursed)\b", r"\brefunded you\b",
    r"\byou('ll| will) (get|receive|be getting|see) (a |your |the |full |the full )?(refund|money back)",
    r"\byou('ll| will) be (fully )?refunded\b",
    r"\b(your |the )?refund (has been|was|is being|will be|is) (issued|processed|approved|sent|initiated|on its way|granted)",
    r"\b(we|i)('ll| will) (give|send|pay) (you )?(your |the )?money back", r"\byour money (is|will be) (on its way|returned|back)",
    r"\bwe('ll| will) make sure you get (a |your )?refund", r"\brefund is guaranteed\b", r"\bguarantee(d)? (a |you a )?refund",
    # sr (latin; cyrillic is transliterated)
    r"\b(vraticemo|vraticu|refundiracemo|refundiracu|nadoknadicemo)\b", r"\b(cemo|cu) (vam |ti )?(vratiti|refundirati|nadoknaditi)",
    r"\b(vratili|vratio|vratila|refundirali|refundirao|refundirala|uplatili) (smo|sam) (vam |ti )?(novac|pare|iznos|uplatu)",
    r"\b(smo|sam) (vam |ti )?(vratili|vratio|vratila|refundirali|refundirao) (novac|pare|iznos)",
    r"\b(izvrsili|odobrili|pokrenuli|izdali|obradili) smo (vam )?(povracaj|refundaciju)",
    r"\b(povracaj|refundacija)\w* (novca )?(je|ce biti) (odobren|izvrsen|obradjen|poslat|uplacen)",
    r"\b(novac|iznos)\w* (vam |ti )?(ce biti|je) (vracen|refundiran|uplacen)", r"\bdobicete (svoj |vas |nazad )?(novac|povracaj)",
    # es
    r"\b(te |le |les |os )?(reembolsaremos|devolveremos|reintegraremos)\b", r"\b(vamos|voy) a (reembolsar|devolver)",
    r"\b(hemos|he|ya) (emitido|procesado|realizado|tramitado|aprobado|iniciado|enviado) (el |un |tu |su |el total del )?reembolso",
    r"\b(te |le )(hemos|he) (reembolsado|devuelto)", r"\brecibiras (el |un |tu |su )?(reembolso|dinero)",
    r"\b(el |tu |su )?reembolso (ha sido|fue|esta siendo|sera|esta) (emitido|procesado|aprobado|realizado|enviado|en camino)",
    r"\bse te reembolsara\b", r"\bseras reembolsad",
    # de
    r"\bwir (werden )?(ihnen |dir |euch )?(den betrag |das geld |ihr geld |dein geld )?(zuruckerstatten|erstatten|zuruckzahlen|zuruckgeben)\b",
    r"\bwir erstatten\b", r"\bich (werde )?(ihnen |dir )?.{0,20}(zuruckerstatten|erstatten)\b",
    r"\b(wir|ich) (haben|habe) (ihnen |dir )?.{0,25}(erstattet|zuruckerstattet|zuruckuberwiesen|zuruckgezahlt)",
    r"\b(die )?(ruck)?erstattung (wurde|ist|wird) (bereits )?(veranlasst|bearbeitet|genehmigt|ausgestellt|durchgefuhrt|ausgelost|unterwegs)",
    r"\b(sie erhalten|du erhaltst|du bekommst|sie bekommen) (ihr |dein |das )?(geld|eine (ruck)?erstattung|den betrag) (zuruck)?",
    # pt
    r"\b(vamos|iremos|vou|irei) (te |lhe )?(reembolsar|devolver)", r"\b(te |lhe )?(reembolsaremos|devolveremos)\b",
    r"\b(ja )?(reembolsamos|reembolsei|estornamos|estornei)\b",
    r"\b(emitimos|processamos|aprovamos|iniciamos|realizamos|fizemos) (o |um |seu |o seu )?(reembolso|estorno)",
    r"\b(voce )?(vai receber|recebera|ira receber) (o |um |seu |o seu )?(reembolso|estorno|dinheiro)",
    r"\b(o |seu )?(reembolso|estorno) (foi|esta|sera) (aprovado|processado|emitido|realizado|a caminho)",
    r"\bvoce sera reembolsad",
    # fr
    r"\bnous (allons )?vous (rembourser|rembourserons)\b", r"\b(nous|je) vous rembourser(ai|ons)\b",
    r"\b(nous vous avons|je vous ai) rembourse", r"\b(nous avons|j'ai) (emis|effectue|traite|approuve|lance|initie) (le |un |votre )?remboursement",
    r"\b(le |votre )?remboursement (a ete|est|sera) (emis|effectue|traite|approuve|en cours|envoye)",
    r"\bvous serez rembourse", r"\bvous (allez )?recevr(ez|oir) (un |votre |le )?remboursement",
    # it
    r"\b(ti |le |vi )?(rimborseremo|rimborsero|restituiremo)\b", r"\b(ti |le |vi )?(abbiamo|ho) (gia )?(rimborsato|restituito)",
    r"\b(abbiamo|ho) (emesso|effettuato|elaborato|approvato|avviato) (il |un |tuo |il tuo )?rimborso",
    r"\b(riceverai|ricevera) (il |un |tuo |il tuo )?(rimborso|denaro|soldi)",
    r"\b(il |tuo |il tuo )?rimborso (e stato|e|sara|verra) (emesso|effettuato|elaborato|approvato|in arrivo)",
    r"\bsarai rimborsat", r"\bverrai rimborsat",
    # ru
    r"(мы|я) (обязательно )?(верн[её]м|верну|возвратим|возмест)\w*", r"(мы|я) (уже )?(вернули|вернул|вернула|возместили|оформили возврат|сделали возврат|одобрили возврат)",
    r"возврат\w* (средств |денег )?(уже )?(оформлен|одобрен|выполнен|произвед[её]н|отправлен|будет)",
    r"деньги (будут |уже )?(возвращ|верн[уё]т)", r"вы получите (возврат|деньги|свои деньги)",
]
_REFUND_PROMISE_RE = [re.compile(p, re.I) for p in _REFUND_PROMISE]
# Passive "the refund was/has been processed" statements: in the REFUNDED state these restate a fact, so only the
# first-person / future patterns apply there.
_PASSIVE_PREFIXES = (r"\b(your |the )?refund", r"\b(povracaj", r"\b(novac|iznos)", r"\b(el |tu |su )?reembolso",
                     r"\b(die )?(ruck)?erstattung", r"\b(o |seu )?(reembolso", r"\b(le |votre )?remboursement",
                     r"\b(il |tuo |il tuo )?rimborso", r"возврат", r"деньги")
_REFUND_ACTIVE_RE = [r for r in _REFUND_PROMISE_RE if not r.pattern.startswith(_PASSIVE_PREFIXES)]

# ---------------------------------------------------------------------------------------------------------------------
# Claims that something was DONE
# ---------------------------------------------------------------------------------------------------------------------
_DONE = {
    "granted": [
        r"\b(i|we)('ve| have)? (just |now |already )?(granted|given|unlocked|activated|reactivated|re-enabled|extended|added|turned on|switched on|enabled)\b.{0,40}\b(premium|access|pro|subscription|days|extension|account)",
        r"\b(premium|access|pro|subscription)\b.{0,20}\b(has been|is now|was just|have been) (granted|unlocked|activated|reactivated|re-enabled|extended|added|turned back on)",
        r"\byou (now )?have (premium|pro|access|full access)\b.{0,15}\b(again|back)\b", r"\byou('re| are) all set\b",
        r"\b(i|we)('ve| have)? \w+ (you |it )?(and|&) (also )?(have )?(granted|given|unlocked|activated|reactivated|extended|enabled)\b.{0,30}\b(premium|access|pro|subscription|days)",
        r"\b(unlocked|activated|reactivated|enabled) (your |the )?(premium|pro|lumen premium|full access)\b(?! (once|when|if|after))",
        r"\b(dodelili|dodelio|dodelila|aktivirali|aktivirao|aktivirala|otkljucali|otkljucao|produzili|produzio|odobrili|odobrio|ukljucili|ukljucio) (smo|sam)\b(?! (vam )?(zahtev|povracaj))",
        r"\b(smo|sam) (vam |ti )?(dodelili|dodelio|aktivirali|aktivirao|otkljucali|produzili|produzio|ukljucili)\b",
        r"\b(premium|premijum|pristup)\w* (vam |ti )?(je )?(sada )?(aktiviran|otkljucan|produzen|dodeljen|ponovo aktivan)",
        r"\b(te |le )?(he|hemos) (activado|otorgado|concedido|dado|desbloqueado|extendido|reactivado|anadido)\b",
        r"\b(premium|acceso|suscripcion)\b.{0,15}\b(ha sido|esta ya|ya esta) (activad|desbloquead|reactivad|extendid|concedid)",
        r"\b(ich|wir) (habe|haben) (ihnen |dir |ihr |dein |deinen |ihren )?.{0,30}(freigeschaltet|aktiviert|gewahrt|verlangert|reaktiviert|gutgeschrieben)",
        r"\b(premium|zugang|abo)\b.{0,20}\b(wurde|ist (jetzt|nun|wieder)) (wieder )?(freigeschaltet|aktiviert|verlangert|reaktiviert)",
        r"\b(ativamos|liberamos|concedemos|desbloqueamos|estendemos|reativamos|ativei|liberei|concedi|desbloqueei|estendi|reativei)\b",
        r"\b(nous (vous )?avons|je vous ai|j'ai) (active|accorde|debloque|prolonge|reactive|offert|ajoute)",
        r"\b(ti |le |vi )?(abbiamo|ho) (attivato|concesso|sbloccato|esteso|prolungato|riattivato|regalato|aggiunto)",
        r"(мы|я) (уже )?(активировал|выдал|предоставил|разблокировал|продлил|включил|подключил)\w*",
        r"(премиум|доступ|подписк)\w* (уже |снова )?(активирован|предоставлен|продл[её]н|разблокирован|включ[её]н)",
    ],
    "restored": [
        r"\b(i|we)('ve| have)? (just |now |already )?(restored|recovered|moved|transferred|synced|fixed)\b.{0,30}\b(purchase|premium|access|subscription|account)",
        r"\b(purchase|premium|access|subscription)\b.{0,20}\b(has been|is now|was just) (restored|recovered|transferred|fixed)",
        r"\b(vratili|vratio|vratila|preneli|preneo|popravili|popravio) (smo|sam) (vam |ti )?(pristup|kupovin|premium|premijum|pretplat)",
        r"\b(smo|sam) (vam |ti )?(vratili|vratio|preneli|popravili) (pristup|kupovin|premium|premijum|pretplat)",
        r"\b(te |le )?(he|hemos) (restaurado|recuperado|transferido|arreglado)\b",
        r"\b(ich|wir) (habe|haben) .{0,30}(wiederhergestellt|ubertragen|repariert)",
        r"\b(restauramos|recuperamos|transferimos|restaurei|recuperei|transferi)\b",
        r"\b(nous (vous )?avons|je vous ai|j'ai) (restaure|recupere|transfere|retabli)",
        r"\b(ti |le )?(abbiamo|ho) (ripristinato|recuperato|trasferito)",
        r"(мы|я) (уже )?(восстановил|перенес|перен[её]с|вернул доступ|вернули доступ)\w*",
    ],
    "cancelled": [
        r"\b(i|we)('ve| have)? (just |now |already )?(cancelled|canceled|stopped|turned off|ended|terminated)\b.{0,15}\b(your|the) (subscription|renewal|plan|auto-?renew)",
        r"\b(otkazali|otkazao|otkazala|ugasili|ugasio|iskljucili|iskljucio) (smo|sam) (vam |ti )?(pretplat|obnov)",
        r"\b(smo|sam) (vam |ti )?(otkazali|otkazao|ugasili|iskljucili) (pretplat|obnov)",
        r"\b(he|hemos) cancelado (tu|su|la)\b", r"\b(ich|wir) (habe|haben) .{0,20}(gekundigt|storniert|beendet)",
        r"\b(cancelamos|cancelei) (a sua|sua|a tua|tua|a assinatura)", r"\b(nous (vous )?avons|je vous ai|j'ai) (resilie|annule) (votre|ton|l'abonnement)",
        r"\b(abbiamo|ho) (annullato|disdetto|cancellato) (il tuo|il suo|tuo|l'abbonamento)", r"(мы|я) (уже )?(отменил|отключил)\w* (вашу |твою |ваш )?(подписк|продлен|автопродлен)",
    ],
    "payment_updated": [
        r"\b(i|we)('ve| have)? (just |now |already )?(updated|changed|fixed|replaced)\b.{0,15}\b(your )?(card|payment method|billing)",
        r"\b(azurirali|azurirao|promenili|promenio) (smo|sam) (vam |ti )?(karticu|nacin placanja)",
        r"\b(he|hemos) (actualizado|cambiado) (tu|su) (tarjeta|metodo de pago)",
        r"\b(ich|wir) (habe|haben) .{0,20}(zahlungsmethode|karte) .{0,10}(aktualisiert|geandert)",
        r"\b(atualizamos|atualizei|alteramos) (o seu|seu|o) (cartao|metodo de pagamento)",
        r"\b(nous avons|j'ai) (mis a jour|change) (votre|ta) (carte|moyen de paiement)",
        r"\b(abbiamo|ho) (aggiornato|cambiato) (la tua|la sua) (carta|metodo di pagamento)",
        r"(мы|я) (обновил|изменил|поменял)\w* (вашу |ваш )?(карту|способ оплаты)",
    ],
}
_ESCALATED = [
    r"\b(i|we)('ve| have)? (just |now |already )?(forwarded|escalated|passed|sent|handed|flagged|shared|referred)\b.{0,40}\b(team|colleague|support|human|person|developer|specialist|staff)",
    r"\b(a person|someone|a human|a member of (our|the) team|our (support )?team|the team|a colleague)\b.{0,15}\bwill (get back|contact|reach out|reply|follow up|look into|review)",
    r"\b(prosledili|prosledio|prosledila|predali|predao|preneli) (smo|sam)\b", r"\b(smo|sam) (vas |vaš |vas |ga |slucaj )?.{0,20}prosledi",
    r"\b(nas |naš |nas )?tim (ce vam se javiti|ce vas kontaktirati|ce pregledati|ce razmotriti)",
    r"\b(he|hemos) (enviado|derivado|pasado|escalado|trasladado|remitido)\b.{0,40}(equipo|soporte|persona|companer)",
    r"\b(nuestro equipo|alguien del equipo|una persona)\b.{0,15}\b(te|le|se) (contactara|escribira|respondera|pondra)",
    r"\b(ich|wir) (habe|haben)\b.{0,40}(weitergeleitet|ubergeben|eskaliert)", r"\b(unser team|ein mitarbeiter|jemand)\b.{0,20}(meldet sich|wird sich .{0,10}melden|pruft)",
    r"\b(encaminhamos|encaminhei|repassamos|repassei|escalamos|escalei)\b", r"\b(nossa equipe|alguem da equipe)\b.{0,15}(vai|ira|entrara)",
    r"\b(nous (vous )?avons|je vous ai|j'ai) (transmis|transfere|escalade|remonte)", r"\b(notre equipe|quelqu'un)\b.{0,15}(vous recontactera|reviendra vers vous|va examiner|examinera)",
    r"\b(abbiamo|ho) (inoltrato|trasmesso|passato|girato|segnalato)\b", r"\b(il nostro team|qualcuno del team)\b.{0,15}(ti contattera|ti rispondera|esaminera)",
    r"(мы|я) (уже )?(передал|переслал|направил|эскалировал)\w*", r"(наша команда|сотрудник|специалист)\w* (свяжется|ответит|рассмотрит|проверит)",
]
_GRANT_TOPIC = [
    r"\b(courtesy|goodwill|complimentary|free|extra|bonus|additional) (days?|extension|access|premium|period|time)\b", r"\bextension of (your )?access\b",
    r"\b(besplatn|dodatn|gratis)\w* (dan|dana|pristup|produzenj|premijum|premium)", r"\bprodu(z|ž)enj\w* pristupa\b",
    r"\b(dias?|acceso|extension|periodo) (gratis|adicional\w*|extra|de cortesia|de regalo)", r"\b(acesso|dias?|extensao|periodo) (gratis|gratuito|adiciona\w*|extra|de cortesia)",
    r"\b(kostenlos|zusatzlich|gratis|extra)\w* (tage?|zugang|verlangerung|premium)", r"\bkulanz",
    r"\b(jours?|acces|prolongation|periode) (gratuit|supplementaire|offert|de courtoisie|bonus)\w*", r"\bgeste commercial",
    r"\b(giorni|accesso|estensione|periodo) (gratis|gratuit|aggiuntiv|extra|di cortesia|omaggio)\w*",
    r"(бесплатн|дополнительн|бонусн)\w* (дн|доступ|продлен|период|премиум)", r"продлени\w* доступа",
]
_GRANT_PROMISED = [
    r"\byou('ll| will) (get|receive|have|be given)\b.{0,30}\b(free|extra|bonus|additional|courtesy|complimentary)\b",
    r"\b(dobicete|dobices|imacete|imaces)\b.{0,30}\b(besplatn|dodatn|gratis)", r"\b(recibiras|tendras|recibira|tendra)\b.{0,30}\b(gratis|extra|adicional|cortesia)",
    r"\b(sie erhalten|du erhaltst|du bekommst|sie bekommen)\b.{0,30}\b(kostenlos|gratis|zusatzlich|extra)",
    r"\b(voce (vai )?(receber|ganhar|tera)|recebera|ganhara)\b.{0,30}\b(gratis|extra|adiciona|cortesia)",
    r"\bvous (allez )?(recevr|aur|beneficier|obten)\w*\b.{0,30}\b(gratuit|supplementaire|offert|bonus)",
    r"\b(riceverai|avrai|ricevera|avra)\b.{0,30}\b(gratis|gratuit|aggiuntiv|extra|omaggio)", r"вы получите.{0,30}(бесплатн|дополнительн|бонус)",
]
_GRANT_REQUEST_WORDS = [
    r"request", r"\basked\b", r"\breview", r"\bapprov", r"\bpending\b",
    r"zatraz", r"zahtev", r"odobr", r"pregled", r"razmotr", r"\bproveri",
    r"solicit", r"revis", r"aprob", r"aprova", r"analis", r"pedido", r"pedimos",
    r"angefragt", r"beantragt", r"anfrage", r"\bprufen", r"\bgepruft", r"genehmig", r"\bpruft",
    r"\bdemand", r"examin", r"valid", r"approb",
    r"richiest", r"chiesto", r"valut", r"approva", r"esamin",
    r"запрос", r"заявк", r"рассмотр", r"одобр", r"провер",
]


def _compile(ps: list[str]) -> list[re.Pattern]:
    return [re.compile(p, re.I) for p in ps]


_DONE_RE = {k: _compile(v) for k, v in _DONE.items()}
_ESCALATED_RE = _compile(_ESCALATED)
_GRANT_TOPIC_RE = _compile(_GRANT_TOPIC)
_GRANT_PROMISED_RE = _compile(_GRANT_PROMISED)
_GRANT_REQUEST_RE = _compile(_GRANT_REQUEST_WORDS)


def _any(res: list[re.Pattern], hay: str) -> bool:
    return any(r.search(hay) for r in res)


def _haystack(text: str) -> str:
    return _norm(text) + "\n" + text.lower()


def refund_promised(text: str) -> bool:
    return _any(_REFUND_PROMISE_RE, _haystack(text))


def check(text: str, facts: Any, actions: Iterable[Any] | None, state: Any = None) -> list[str]:
    actions = list(actions or [])
    kinds = _kinds(actions)
    fields = _fields(facts)
    violations: list[str] = []
    text = text or ""
    if not text.strip():
        return ["empty_reply"]

    if re.search(r"\{[a-z_]+\}", text):
        violations.append("template_placeholder")

    # (d) URLs first — they are blanked out before the number check.
    url_v, stripped = _check_urls(text, facts)
    # (a) numbers / dates / prices / percentages
    violations += _check_numbers(stripped, facts)
    violations += url_v

    hay = _haystack(stripped)
    # (b) refund promises (never allowed; App Store tagged because Apple alone decides)
    refund_res = _REFUND_ACTIVE_RE if _code(state) == "REFUNDED" else _REFUND_PROMISE_RE
    if _any(refund_res, hay):
        store = fields.get("store") or getattr(getattr(state, "primary", None), "store", None)
        violations.append("refund_promise:app_store" if store == "app_store" else "refund_promise")

    # (c) claims that something was done. None of these actions is something Case Desk ever performs.
    grant_done = _any(_DONE_RE["granted"], hay)
    if grant_done and _code(state) == "GRANTED_BY_DEVELOPER":
        # Describing an earlier developer grant is a status fact, not a new action: only flag first-person claims.
        grant_done = bool(re.search(r"\b(i|we)('ve| have)? (just |now )?(granted|given|unlocked|activated|extended)", hay))
    if grant_done:
        violations.append("grant_stated_as_done" if "PROPOSE_GRANT" in kinds else "claimed_action:granted")
    for what in ("restored", "cancelled", "payment_updated"):
        if _any(_DONE_RE[what], hay):
            violations.append(f"claimed_action:{what}")
    if _any(_ESCALATED_RE, hay) and not ({"ESCALATE_TO_HUMAN", "PROPOSE_GRANT"} & kinds):
        violations.append("claimed_action:escalated")

    # (e) grants: requested, never granted or promised
    if "PROPOSE_GRANT" in kinds:
        if _any(_GRANT_PROMISED_RE, hay) and "grant_stated_as_done" not in violations:
            violations.append("grant_stated_as_done")
        if not _any(_GRANT_REQUEST_RE, hay):
            violations.append("grant_not_framed_as_request")
    elif _any(_GRANT_TOPIC_RE, hay) or _any(_GRANT_PROMISED_RE, hay):
        violations.append("grant_mentioned_without_action")

    # (f) length
    n_words = len(re.findall(r"\S+", _URL_RE.sub("URL", text)))
    if n_words > MAX_WORDS:
        violations.append(f"too_long:{n_words}")

    # de-duplicate, keep order
    seen: set[str] = set()
    return [v for v in violations if not (v in seen or seen.add(v))]
