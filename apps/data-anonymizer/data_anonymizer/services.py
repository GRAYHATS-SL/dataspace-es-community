"""Construccion de las piezas a partir de la configuracion (una vez por proceso)."""

from __future__ import annotations

import logging
import secrets
from dataclasses import dataclass, field

from .config import Settings
from .core.engine import JsonAnonymizer
from .core.policy import Policy, PolicyError, load_policies
from .core.pseudonymize import Pseudonymizer
from .media.service import MediaService
from .media.video import Ffmpeg
from .pii.detector import Detector
from .pii.names import NameRecognizer, load_first_names
from .pii.ner import NerBackend, load_spacy

log = logging.getLogger("data_anonymizer")

#: Politica que existe siempre, aunque no haya directorio de politicas:
#: deteccion automatica en todos los textos y pistas por nombre de clave.
BUILTIN_AUTO = Policy(name="auto", description="Deteccion automatica de PII (integrada)")


@dataclass
class Services:
    settings: Settings
    pseudonymizer: Pseudonymizer
    detector: Detector
    policies: dict[str, Policy]
    media: MediaService
    ephemeral_secret: bool = False
    _engines: dict[str, JsonAnonymizer] = field(default_factory=dict)

    def engine(self, policy_name: str | None) -> JsonAnonymizer:
        name = policy_name or self.settings.default_policy
        if name not in self.policies:
            raise KeyError(name)
        if name not in self._engines:
            self._engines[name] = JsonAnonymizer(self.policies[name], self.pseudonymizer, self.detector)
        return self._engines[name]


def build_services(settings: Settings, *, ner: NerBackend | None = None) -> Services:
    secret = settings.anon_secret
    ephemeral = False
    if not secret:
        secret = secrets.token_urlsafe(32)
        ephemeral = True
        log.warning("ANON_SECRET no esta definido: se usa uno aleatorio. Los alias cambiaran "
                    "en cada reinicio. Define ANON_SECRET para que sean estables.")
    elif settings.secret_is_insecure:
        log.warning("ANON_SECRET tiene el valor de ejemplo: cualquiera puede recalcular los alias.")

    first_names = load_first_names(settings.detection_names_file or None)
    if ner is None and settings.ner_model:
        ner = load_spacy(settings.ner_model, first_names)
    detector = Detector(NameRecognizer(first_names), ner)

    policies: dict[str, Policy] = {"auto": BUILTIN_AUTO}
    if settings.policies_dir.is_dir():
        policies.update(load_policies(settings.policies_dir))
    else:
        log.warning("No existe %s: solo esta disponible la politica 'auto'.", settings.policies_dir)

    if settings.default_policy not in policies:
        raise PolicyError(f"DEFAULT_POLICY={settings.default_policy} no existe. "
                          f"Disponibles: {sorted(policies)}")
    for policy in policies.values():
        if policy.detection.ner == "on" and ner is None:
            raise PolicyError(f"La politica '{policy.name}' exige NER (detection.ner: on) pero no hay "
                              "modelo cargado. Define NER_MODEL o cambia a 'auto'.")

    media = MediaService(Ffmpeg(settings.ffmpeg_path, settings.ffprobe_path, settings.media_timeout_seconds))
    return Services(
        settings=settings,
        pseudonymizer=Pseudonymizer(secret, settings.anon_alias_length),
        detector=detector,
        policies=policies,
        media=media,
        ephemeral_secret=ephemeral,
    )
