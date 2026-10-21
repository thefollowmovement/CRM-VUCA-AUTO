// =====================================================================
//  Voiture 3D de l'accueil (S8). Chargé à la demande par voiture-3d.tsx,
//  uniquement sur ordinateur.
//  Modèle : modeles/voiture.glb (CC BY-SA 4.0, Karol Miklas, adapté :
//  voir modeles/LICENCE-voiture.txt ; crédit affiché dans la scène).
//  Le fichier est copié par webpack dans /_next/static (nom haché,
//  cache long) : aucune règle de routage à ajouter pour le site.
// =====================================================================
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export type Voiture3D = { arreter: () => void };

const URL_MODELE = new URL("./modeles/voiture.glb", import.meta.url).href;

// Repères du modèle (mètres, Y en haut, avant vers +Z) : bas des pneus et noms des essieux
const SOL_MODELE = -0.632;
// Une roue par nœud, centré sur son axe (roues avant redressées : le modèle d'origine les braquait)
const ROUES = ["roue_av_d", "roue_av_g", "roue_ar_d", "roue_ar_g"];
const ECHELLE = 1.3;

/**
 * Lance la scène dans `canvas` (fond transparent : le décor CSS reste visible derrière).
 * Promesse résolue quand le modèle est chargé et la première image dessinée.
 * `accent` colore la lumière de contre-jour.
 */
export async function demarrerVoiture3d(canvas: HTMLCanvasElement, conteneur: HTMLElement, options: { accent: string }): Promise<Voiture3D> {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environnement = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = environnement;
  scene.environmentIntensity = 1.1;

  const camera = new THREE.PerspectiveCamera(24, 2, 0.1, 100);

  // Lumières : principale, contre-jour couleur d'accent, remplissage froid
  const principale = new THREE.DirectionalLight("#ffffff", 1.4);
  principale.position.set(4, 6, 5);
  scene.add(principale);
  const contreJour = new THREE.DirectionalLight(options.accent, 2.4);
  contreJour.position.set(-5, 2.5, -4);
  scene.add(contreJour);
  scene.add(new THREE.HemisphereLight("#cfd8ff", "#0a0a0b", 0.4));

  // Modèle
  const chargeur = new GLTFLoader();
  chargeur.setMeshoptDecoder(MeshoptDecoder);
  let gltf;
  try {
    gltf = await chargeur.loadAsync(URL_MODELE);
  } catch (e) {
    environnement.dispose();
    pmrem.dispose();
    renderer.dispose();
    throw e;
  }
  const modele = gltf.scene;
  // L'avant (+Z du modèle) regarde vers +X (sens de la route), pneus posés sur y = 0
  modele.rotation.y = Math.PI / 2;
  modele.position.y = -SOL_MODELE;
  const roues = ROUES.map((nom) => modele.getObjectByName(nom)).filter((o): o is THREE.Object3D => !!o);

  const voiture = new THREE.Group();
  voiture.scale.setScalar(ECHELLE);
  voiture.add(modele);
  const pivot = new THREE.Group(); // rotation d'ensemble (souris, balancement)
  pivot.add(voiture);
  scene.add(pivot);

  // Cadrage : vue de trois-quarts avant, la voiture posée sur la route (bas de l'image)
  const cadrer = () => {
    const l = conteneur.clientWidth;
    const h = conteneur.clientHeight;
    if (!l || !h) return;
    renderer.setSize(l, h, false);
    camera.aspect = l / h;
    const distance = Math.max(8.6, 11.5 / Math.min(camera.aspect, 2.6) + 4.6);
    camera.position.set(distance * 0.5, 1.7, distance * 0.87);
    camera.lookAt(0.1, 0.78, 0);
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
    voiture.position.x = -10 * Math.pow(1 - avance, 3);
    // Roues (axe X du modèle) : rapides pendant l'arrivée, puis « roulent sur place » avec la route
    const vitesse = avance < 1 ? 30 : 10;
    for (const r of roues) r.rotation.x += vitesse * dt;
    // Suspension et balancement
    voiture.position.y = Math.sin(t * 12) * 0.006;
    const balancement = Math.sin(t * 0.6) * 0.12;
    pivot.rotation.y += (cibleRotation + balancement - pivot.rotation.y) * 0.06;
    renderer.render(scene, camera);
    image = requestAnimationFrame(boucle);
  }
  renderer.render(scene, camera);
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
        if (!(o instanceof THREE.Mesh)) return;
        o.geometry.dispose();
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          for (const v of Object.values(m)) if (v instanceof THREE.Texture) v.dispose();
          m.dispose();
        }
      });
      environnement.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
}
