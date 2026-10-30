// =====================================================================
//  Lecture d'un avis de contravention par l'API Claude (SDK officiel).
//  Une page (image JPEG/PNG ou PDF d'une page) → champs structurés, via
//  un outil unique « enregistrer_avis ». La clé reste dans .env
//  (ANTHROPIC_API_KEY) : jamais envoyée au navigateur ni journalisée.
// =====================================================================
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

export const MODELE_PAR_DEFAUT = "claude-haiku-5-5";

export const PROMPT_SYSTEME = `Tu lis des documents administratifs français liés aux infractions routières (avis de contravention ANTAI, avis d'amende forfaitaire délictuelle, avis d'amende forfaitaire majorée).
Extrais uniquement ce qui est réellement imprimé sur le document. N'invente jamais une valeur : si un champ est absent ou illisible, renvoie null et une confiance "basse".
Si la page n'est pas un avis (verso, formulaire de requête en exonération, carte de paiement, page blanche), renvoie est_un_avis = false.
Dates au format AAAA-MM-JJ, heures au format HH:MM (24 h). Immatriculation en majuscules au format AA-123-AA quand c'est une plaque SIV.
Enregistre toujours le résultat avec l'outil enregistrer_avis.`;

const NIVEAU = { type: "string", enum: ["haute", "moyenne", "basse"] } as const;

export const OUTIL_ENREGISTRER_AVIS: Anthropic.Tool = {
  name: "enregistrer_avis",
  description: "Enregistre les informations lues sur une page d'avis de contravention.",
  input_schema: {
    type: "object",
    properties: {
      est_un_avis: { type: "boolean" },
      type_avis: { type: "string", enum: ["contravention", "amende_forfaitaire_delictuelle", "amende_majoree", "autre"] },
      numero_avis: { type: ["string", "null"], description: "Numéro de l'avis (10 chiffres) ou référence de l'amende majorée (12 ou 18 chiffres), chiffres uniquement" },
      date_avis: { type: ["string", "null"], description: "Date de l'avis / date d'envoi, AAAA-MM-JJ" },
      date_infraction: { type: ["string", "null"], description: "AAAA-MM-JJ" },
      heure_infraction: { type: ["string", "null"], description: "HH:MM" },
      immatriculation: { type: ["string", "null"] },
      lieu: { type: ["string", "null"] },
      nature: { type: ["string", "null"] },
      montant_forfaitaire: { type: ["number", "null"] },
      nom_titulaire: { type: ["string", "null"], description: "Nom ou raison sociale du destinataire de l'avis" },
      confiance: {
        type: "object",
        properties: { numero_avis: NIVEAU, date_avis: NIVEAU, date_infraction: NIVEAU, heure_infraction: NIVEAU, immatriculation: NIVEAU },
      },
      remarques: { type: ["string", "null"] },
    },
    required: ["est_un_avis", "confiance"],
  },
};

const niveau = z.enum(["haute", "moyenne", "basse"]).optional().catch(undefined);
const texte = z.string().nullish().transform((v) => (v && v.trim() ? v.trim() : null)).catch(null);

/** Validation de la réponse de l'outil (on ne fait jamais confiance aveuglément au JSON reçu). */
export const schemaExtraction = z.object({
  est_un_avis: z.boolean(),
  type_avis: z.enum(["contravention", "amende_forfaitaire_delictuelle", "amende_majoree", "autre"]).nullish().catch(null),
  numero_avis: texte,
  date_avis: texte,
  date_infraction: texte,
  heure_infraction: texte,
  immatriculation: texte,
  lieu: texte,
  nature: texte,
  montant_forfaitaire: z.number().nonnegative().nullish().catch(null),
  nom_titulaire: texte,
  confiance: z.object({ numero_avis: niveau, date_avis: niveau, date_infraction: niveau, heure_infraction: niveau, immatriculation: niveau }).catch({}),
  remarques: texte,
});
export type Extraction = z.infer<typeof schemaExtraction>;

export type ResultatLecture = { extraction: Extraction; brut: unknown; modele: string; tokensEntree: number; tokensSortie: number };

/** Erreur de lecture affichable (« Lecture impossible »), détail technique à part. */
export class ErreurLecture extends Error {
  constructor(
    message: string,
    public detail?: string,
  ) {
    super(message);
  }
}

export function cleApiConfiguree(): boolean {
  return !!process.env.ANTHROPIC_API_KEY?.trim();
}

// Les modèles qui refusent un appel d'outil imposé (tool_choice « tool ») : on leur demande
// l'outil par la consigne, avec tool_choice « auto ».
const SANS_OUTIL_IMPOSE = /^claude-(opus-5-5|sonnet-5-5|fable-5-1|mythos-5-1)/;

let clientParDefaut: Anthropic | null = null;
function client(): Anthropic {
  // 3 tentatives au total : le SDK réessaie lui-même (attente exponentielle) sur 408, 409, 429 et 5xx (dont 529).
  clientParDefaut ??= new Anthropic({ maxRetries: 2, timeout: 120_000 });
  return clientParDefaut;
}

/**
 * Lit une page. `typeMime` : image/jpeg, image/png ou application/pdf (une page).
 * Lève ErreurLecture si l'API échoue après les nouvelles tentatives, refuse, ou ne renvoie pas l'outil.
 */
export async function lireAvis(params: { contenu: Buffer; typeMime: string; modele?: string; client?: Anthropic }): Promise<ResultatLecture> {
  const modele = params.modele?.trim() || MODELE_PAR_DEFAUT;
  const donnees = params.contenu.toString("base64");
  const bloc: Anthropic.ContentBlockParam =
    params.typeMime === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: donnees } }
      : { type: "image", source: { type: "base64", media_type: params.typeMime === "image/png" ? "image/png" : "image/jpeg", data: donnees } };

  let reponse: Anthropic.Message;
  try {
    // Pas de « temperature » : l'API ne l'accepte plus (400) ; la sortie est cadrée par l'outil.
    reponse = await (params.client ?? client()).messages.create({
      model: modele,
      max_tokens: 4096,
      system: PROMPT_SYSTEME,
      tools: [OUTIL_ENREGISTRER_AVIS],
      tool_choice: SANS_OUTIL_IMPOSE.test(modele) ? { type: "auto" } : { type: "tool", name: OUTIL_ENREGISTRER_AVIS.name },
      messages: [{ role: "user", content: [bloc, { type: "text", text: "Lis cette page et enregistre le résultat avec l'outil enregistrer_avis." }] }],
    });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) throw new ErreurLecture("Lecture impossible : clé API refusée", "401");
    if (e instanceof Anthropic.BadRequestError) throw new ErreurLecture("Lecture impossible : document refusé par l'API", e.message);
    if (e instanceof Anthropic.RateLimitError) throw new ErreurLecture("Lecture impossible : limite d'appels atteinte", "429");
    if (e instanceof Anthropic.APIError) throw new ErreurLecture("Lecture impossible : service indisponible", `${e.status ?? ""} ${e.message}`);
    throw new ErreurLecture("Lecture impossible : service injoignable", e instanceof Error ? e.message : String(e));
  }

  const tokensEntree = reponse.usage.input_tokens;
  const tokensSortie = reponse.usage.output_tokens;
  if (reponse.stop_reason === "refusal") throw new ErreurLecture("Lecture impossible : demande refusée par le modèle", JSON.stringify(reponse.stop_details ?? null));
  const appel = reponse.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === OUTIL_ENREGISTRER_AVIS.name);
  if (!appel) throw new ErreurLecture("Lecture impossible : réponse sans résultat", reponse.stop_reason ?? "");
  const lecture = schemaExtraction.safeParse(appel.input);
  if (!lecture.success) throw new ErreurLecture("Lecture impossible : réponse illisible", lecture.error.message);
  return { extraction: lecture.data, brut: appel.input, modele, tokensEntree, tokensSortie };
}
