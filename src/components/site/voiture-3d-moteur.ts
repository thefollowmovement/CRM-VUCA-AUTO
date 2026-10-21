// =====================================================================
//  Voiture 3D de l'accueil (S8) : SUV coupé stylisé, modélisé ici même
//  (aucun modèle téléchargé, aucune marque). Chargé à la demande par
//  voiture-3d.tsx, uniquement sur ordinateur.
//  Carrosserie = profil 2D extrudé et arrondi ; vitres et toit noirs ;
//  reflets réalistes grâce à un environnement de studio (RoomEnvironment).
// =====================================================================
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export type Voiture3D = { arreter: () => void };

const RAYON_ROUE = 0.4;
const CENTRE_ROUE_Y = 0.41;
const ESSIEU_AVANT = 1.42;
const ESSIEU_ARRIERE = -1.42;
const LARGEUR = 1.7; // profondeur d'extrusion (hors arrondis)

/** Profil latéral de la caisse (avant vers +x), passages de roues compris. */
function profilCaisse(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(2.28, CENTRE_ROUE_Y);
  s.lineTo(ESSIEU_AVANT + 0.5, CENTRE_ROUE_Y);
  s.absarc(ESSIEU_AVANT, CENTRE_ROUE_Y, 0.5, 0, Math.PI, false); // passage de roue avant
  s.lineTo(ESSIEU_ARRIERE + 0.5, CENTRE_ROUE_Y);
  s.absarc(ESSIEU_ARRIERE, CENTRE_ROUE_Y, 0.5, 0, Math.PI, false); // passage de roue arrière
  s.lineTo(-2.3, CENTRE_ROUE_Y);
  s.quadraticCurveTo(-2.44, 0.46, -2.42, 0.78); // bouclier arrière
  s.lineTo(-2.32, 1.1); // haut du hayon (arrière relevé)
  s.quadraticCurveTo(-0.7, 1.2, 0.82, 1.16); // ligne de caisse
  s.quadraticCurveTo(1.85, 1.08, 2.34, 0.88); // capot plongeant
  s.quadraticCurveTo(2.5, 0.8, 2.46, 0.58); // nez
  s.quadraticCurveTo(2.43, 0.41, 2.28, CENTRE_ROUE_Y);
  return s;
}

/** Profil de l'habitacle (pavillon fuyant de SUV coupé). */
function profilHabitacle(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(-2.15, 1.1);
  s.quadraticCurveTo(-1.65, 1.5, -1.05, 1.63);
  s.quadraticCurveTo(-0.3, 1.72, 0.2, 1.66);
  s.lineTo(0.9, 1.14);
  s.lineTo(-2.15, 1.1);
  return s;
}

/**
 * Extrusion arrondie, flancs légèrement inclinés vers l'intérieur en montant (comme une vraie
 * carrosserie). L'inclinaison est LINÉAIRE en hauteur : les flancs restent des plans, donc lisses.
 */
function extruder(forme: THREE.Shape, profondeur: number, arrondi: number, segments: number, inclinaison: number, base: number) {
  const g = new THREE.ExtrudeGeometry(forme, { depth: profondeur, bevelEnabled: true, bevelThickness: arrondi, bevelSize: arrondi * 0.85, bevelSegments: segments, curveSegments: 48 });
  g.translate(0, 0, -profondeur / 2);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) * (1 - inclinaison * Math.max(p.getY(i) - base, 0)));
  g.computeVertexNormals();
  return g;
}

/** Roue : pneu, jante métallique à 5 branches, enjoliveur. */
function roue(materiaux: { pneu: THREE.Material; jante: THREE.Material; centre: THREE.Material }) {
  const g = new THREE.Group();
  const pneu = new THREE.Mesh(new THREE.CylinderGeometry(RAYON_ROUE, RAYON_ROUE, 0.27, 40), materiaux.pneu);
  pneu.rotation.x = Math.PI / 2;
  g.add(pneu);
  const jante = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.285, 40), materiaux.jante);
  jante.rotation.x = Math.PI / 2;
  g.add(jante);
  for (let i = 0; i < 5; i++) {
    const branche = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.27, 0.03), materiaux.centre);
    branche.position.set(Math.sin((i / 5) * Math.PI * 2) * 0.135, Math.cos((i / 5) * Math.PI * 2) * 0.135, 0.15);
    branche.rotation.z = -(i / 5) * Math.PI * 2;
    g.add(branche);
  }
  const moyeu = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.3, 20), materiaux.centre);
  moyeu.rotation.x = Math.PI / 2;
  g.add(moyeu);
  return g;
}

/** Ombre douce au sol (dégradé radial dessiné une fois). */
function ombreSol() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  const d = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  d.addColorStop(0, "rgba(0,0,0,0.85)");
  d.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = d;
  ctx.fillRect(0, 0, 128, 128);
  const plan = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 2.6), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  plan.rotation.x = -Math.PI / 2;
  plan.position.y = 0.005;
  return plan;
}

/**
 * Lance la scène dans `canvas` (fond transparent : le décor CSS reste visible derrière).
 * `accent` colore le liseré lumineux arrière et la lumière de contre-jour.
 */
export function demarrerVoiture3d(canvas: HTMLCanvasElement, conteneur: HTMLElement, options: { accent: string; peinture?: string }): Voiture3D {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environnement = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = environnement;
  scene.environmentIntensity = 1.25;

  const camera = new THREE.PerspectiveCamera(26, 2, 0.1, 100);

  // Lumières : principale, contre-jour couleur d'accent, remplissage froid
  const principale = new THREE.DirectionalLight("#ffffff", 1.6);
  principale.position.set(4, 6, 5);
  scene.add(principale);
  const contreJour = new THREE.DirectionalLight(options.accent, 2.2);
  contreJour.position.set(-5, 2.5, -4);
  scene.add(contreJour);
  scene.add(new THREE.HemisphereLight("#cfd8ff", "#0a0a0b", 0.5));

  // Matériaux
  const peinture = new THREE.MeshPhysicalMaterial({ color: options.peinture ?? "#6b7079", metalness: 0.75, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.04 });
  const verre = new THREE.MeshPhysicalMaterial({ color: "#07080b", metalness: 0.4, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02 });
  const noir = new THREE.MeshStandardMaterial({ color: "#121216", roughness: 0.55, metalness: 0.2 });
  const materiauxRoue = {
    pneu: new THREE.MeshStandardMaterial({ color: "#0d0d0f", roughness: 0.9 }),
    jante: new THREE.MeshStandardMaterial({ color: "#2a2b30", metalness: 0.9, roughness: 0.28 }),
    centre: new THREE.MeshStandardMaterial({ color: "#c9cbd1", metalness: 1, roughness: 0.2 }),
  };
  const ledAvant = new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#ffffff", emissiveIntensity: 2.2 });
  const feuArriere = new THREE.MeshStandardMaterial({ color: "#ff2a2a", emissive: "#ff1a1a", emissiveIntensity: 1.6 });
  const lisere = new THREE.MeshStandardMaterial({ color: options.accent, emissive: options.accent, emissiveIntensity: 0.9 });

  // Voiture
  const voiture = new THREE.Group();
  const caisse = new THREE.Mesh(extruder(profilCaisse(), LARGEUR, 0.14, 8, 0.1, CENTRE_ROUE_Y), peinture);
  voiture.add(caisse);
  const habitacle = new THREE.Mesh(extruder(profilHabitacle(), LARGEUR - 0.3, 0.12, 6, 0.42, 1.06), verre);
  voiture.add(habitacle);
  // Bas de caisse et boucliers noirs (protections), feux
  const basDeCaisse = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.14, LARGEUR + 0.3), noir);
  basDeCaisse.position.set(0, CENTRE_ROUE_Y + 0.04, 0);
  voiture.add(basDeCaisse);
  // Phares LED sur les coins avant + calandre
  for (const z of [1, -1]) {
    const phare = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.045, 0.3), ledAvant);
    phare.position.set(2.37, 0.79, z * (LARGEUR / 2 - 0.05));
    phare.rotation.y = z * 0.5;
    voiture.add(phare);
  }
  const calandre = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.26, LARGEUR * 0.62), noir);
  calandre.position.set(2.45, 0.6, 0);
  voiture.add(calandre);
  // Contours de roues noirs (allure SUV)
  for (const x of [ESSIEU_AVANT, ESSIEU_ARRIERE]) {
    for (const z of [1, -1]) {
      const contour = new THREE.Mesh(new THREE.TorusGeometry(0.53, 0.055, 10, 40, Math.PI), noir);
      contour.position.set(x, CENTRE_ROUE_Y, z * (LARGEUR / 2 + 0.11));
      voiture.add(contour);
    }
  }
  const bandeauArriere = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, LARGEUR + 0.12), feuArriere);
  bandeauArriere.position.set(-2.47, 0.93, 0);
  voiture.add(bandeauArriere);
  const filetAccent = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.015, LARGEUR + 0.32), lisere);
  filetAccent.position.set(0, CENTRE_ROUE_Y + 0.11, 0);
  voiture.add(filetAccent);
  // Montant central couleur carrosserie : sépare les vitres latérales (toit noir « flottant »)
  const inclinaisonVitre = Math.atan(((LARGEUR - 0.3) / 2 + 0.1) * 0.42);
  for (const z of [1, -1]) {
    const montant = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.5, 0.03), peinture);
    montant.position.set(-0.42, 1.39, z * (((LARGEUR - 0.3) / 2 + 0.1) * (1 - 0.42 * 0.33) + 0.012));
    montant.rotation.x = -z * inclinaisonVitre;
    montant.rotation.z = 0.12;
    voiture.add(montant);
  }
  // Rétroviseurs
  for (const z of [1, -1]) {
    const retro = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.09, 0.14), noir);
    retro.position.set(0.72, 1.24, z * (LARGEUR / 2 + 0.06));
    voiture.add(retro);
  }
  // Roues
  const roues: THREE.Group[] = [];
  for (const x of [ESSIEU_AVANT, ESSIEU_ARRIERE]) {
    for (const z of [1, -1]) {
      const r = roue(materiauxRoue);
      r.position.set(x, CENTRE_ROUE_Y, z * (LARGEUR / 2 + 0.02));
      voiture.add(r);
      roues.push(r);
    }
  }
  voiture.add(ombreSol());
  voiture.position.y = 0;
  const pivot = new THREE.Group(); // rotation d'ensemble (souris, balancement)
  pivot.add(voiture);
  scene.add(pivot);

  // Cadrage : la voiture occupe ~80 % de la hauteur de la scène
  const cadrer = () => {
    const l = conteneur.clientWidth;
    const h = conteneur.clientHeight;
    if (!l || !h) return;
    renderer.setSize(l, h, false);
    camera.aspect = l / h;
    // Vue de trois-quarts avant ; la voiture posée sur la route (bas de l'image)
    const distance = Math.max(8.2, 11 / Math.min(camera.aspect, 2.6) + 4.2);
    camera.position.set(distance * 0.5, 1.9, distance * 0.87);
    camera.lookAt(0.15, 1.05, 0);
    camera.updateProjectionMatrix();
  };
  cadrer();
  const observateurTaille = new ResizeObserver(cadrer);
  observateurTaille.observe(conteneur);

  // Interaction : la voiture suit légèrement la souris
  let cibleRotation = 0;
  const suivre = (e: PointerEvent) => {
    const r = conteneur.getBoundingClientRect();
    cibleRotation = ((e.clientX - r.left) / r.width - 0.5) * 0.9;
  };
  const relacher = () => (cibleRotation = 0);
  conteneur.addEventListener("pointermove", suivre);
  conteneur.addEventListener("pointerleave", relacher);

  // Boucle d'animation (arrêtée hors écran ou onglet masqué)
  let visible = true;
  let image = 0;
  const debut = performance.now();
  const horloge = new THREE.Clock();
  const observateurVue = new IntersectionObserver(([e]) => {
    visible = !!e?.isIntersecting;
    if (visible && !image) image = requestAnimationFrame(boucle);
  });
  observateurVue.observe(conteneur);
  const onglet = () => {
    if (!document.hidden && visible && !image) image = requestAnimationFrame(boucle);
  };
  document.addEventListener("visibilitychange", onglet);

  function boucle() {
    image = 0;
    if (!visible || document.hidden) return;
    const dt = Math.min(horloge.getDelta(), 0.05);
    const t = (performance.now() - debut) / 1000;
    // Arrivée : de la gauche vers le centre en 1,6 s (ralentissement en fin de course)
    const avance = Math.min(t / 1.6, 1);
    voiture.position.x = -9 * Math.pow(1 - avance, 3);
    // Roues : rapides pendant l'arrivée, puis « roulent sur place » avec la route
    const vitesse = avance < 1 ? 26 : 9;
    for (const r of roues) r.rotateZ(-vitesse * dt);
    // Suspension et balancement
    voiture.position.y = Math.sin(t * 12) * 0.008;
    const balancement = Math.sin(t * 0.6) * 0.12;
    pivot.rotation.y += (cibleRotation + balancement - pivot.rotation.y) * 0.06;
    renderer.render(scene, camera);
    image = requestAnimationFrame(boucle);
  }
  image = requestAnimationFrame(boucle);

  return {
    arreter() {
      cancelAnimationFrame(image);
      observateurTaille.disconnect();
      observateurVue.disconnect();
      document.removeEventListener("visibilitychange", onglet);
      conteneur.removeEventListener("pointermove", suivre);
      conteneur.removeEventListener("pointerleave", relacher);
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m: THREE.Material) => m.dispose());
        }
      });
      environnement.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
}
