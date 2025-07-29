import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity
} from 'react-native';
import { PanGestureHandler, State as GestureState } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { estimateAdvancedBloodAlcoholContent, calculatePersonalizedElimination } from '../../utils/calculations';
import { User } from '../../types';

interface KnowledgeCarouselProps {
  userTodayUnits: number;
  userProfile?: User['profile'];
  colors: {
    danger: string;
    warning: string;
    success: string;
    info: string;
    primary: string;
    secondary: string;
    text: string;
    textLight: string;
    surface: string;
    border: string;
  };
}

interface CarouselCard {
  type: 'danger' | 'warning' | 'success' | 'info' | 'primary' | 'secondary';
  icon: string;
  color: string;
  title: string;
  main: string;
  items: string[];
  fact: string;
}

export function KnowledgeCarousel({ userTodayUnits, userProfile, colors }: KnowledgeCarouselProps) {
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [carouselData, setCarouselData] = useState<CarouselCard[]>([]);

  // Calcul personnalisé de l'alcoolémie si profil disponible
  const bloodAlcoholData = React.useMemo(() => {
    if (!userProfile || !userProfile.age || !userProfile.height || !userProfile.weight || !userProfile.gender) {
      return null;
    }
    
    return estimateAdvancedBloodAlcoholContent(userTodayUnits, {
      age: userProfile.age,
      gender: userProfile.gender,
      height: userProfile.height,
      weight: userProfile.weight,
      activityLevel: userProfile.activityLevel
    });
  }, [userTodayUnits, userProfile]);
  
  // Calcul simple si pas de profil complet
  const bloodAlcohol = bloodAlcoholData?.bloodAlcohol || (userTodayUnits * 10) / (70 * 0.7);
  const eliminationTime = bloodAlcoholData?.timeToSober || (userTodayUnits * 1.5);

  // Générer les cartes du carousel
  useEffect(() => {
    const allCards: CarouselCard[] = [];

    // === CARTES CONDITIONNELLES SÉCURITÉ (DANGER) ===
    if (userTodayUnits >= 10) {
      allCards.push({
        type: 'danger',
        icon: 'alert-circle',
        color: colors.danger,
        title: 'Signes d\'alerte',
        main: 'Surveillez ces signes d\'intoxication sévère chez vous et vos amis',
        items: [
          '• Confusion, vomissements = urgence',
          '• Peau froide et moite = danger',
          '• Ne jamais laisser quelqu\'un dormir sur le dos'
        ],
        fact: 'La position latérale de sécurité a sauvé des milliers de vies !'
      });
    }

    if (userTodayUnits >= 8) {
      allCards.push({
        type: 'danger',
        icon: 'warning',
        color: colors.danger,
        title: 'Attention - Consommation élevée',
        main: `Avec ${userTodayUnits} unités aujourd'hui, votre alcoolémie estimée est d'environ ${bloodAlcohol.toFixed(3)}g/L`,
        items: [
          `• Temps d'élimination: ~${Math.ceil(eliminationTime)}h`,
          '• Buvez 1 verre d\'eau entre chaque alcool',
          '• Évitez de conduire pendant 24h'
        ],
        fact: 'Le foie met 1h à éliminer 1 unité d\'alcool, peu importe votre poids !'
      });
    }

    if (userTodayUnits >= 6) {
      allCards.push({
        type: 'danger',
        icon: 'shield',
        color: colors.danger,
        title: 'Risques et prévention',
        main: 'Attention : vous approchez de la zone de risque accru',
        items: [
          '• Risque de blackout au-delà de 10 unités',
          '• Les chutes sont 5x plus fréquentes',
          '• Gardez vos amis près de vous'
        ],
        fact: '60% des accidents de festival arrivent après 2h du matin !'
      });
    }

    if (userTodayUnits >= 5) {
      allCards.push({
        type: 'danger',
        icon: 'bed',
        color: colors.danger,
        title: 'Lendemain difficile',
        main: 'Préparez-vous à une journée de récupération demain',
        items: [
          '• La gueule de bois peak 12-14h après',
          '• Vitamines B et C aident la récupération',
          '• Évitez le "hair of the dog", ça empire'
        ],
        fact: 'Le mot "gueule de bois" vient du moyen-âge : "gueule de bois sec" !'
      });
    }

    // === CARTES CONDITIONNELLES SANTÉ (WARNING) ===
    if (userTodayUnits >= 4) {
      allCards.push({
        type: 'warning',
        icon: 'fitness',
        color: colors.warning,
        title: 'Votre corps et l\'alcool',
        main: `Avec ${userTodayUnits} unités, votre foie travaille dur ! Alcoolémie estimée: ${bloodAlcohol.toFixed(3)}g/L`,
        items: [
          `• Élimination complète dans ~${Math.ceil(eliminationTime)}h`,
          '• Votre cerveau libère plus de dopamine',
          '• Votre perception des risques diminue'
        ],
        fact: 'Les festivals consomment en moyenne 2,3L de bière par personne et par jour !'
      });

      allCards.push({
        type: 'warning',
        icon: 'medkit',
        color: colors.warning,
        title: 'Interactions dangereuses',
        main: 'L\'alcool multiplie les risques avec d\'autres substances',
        items: [
          '• Médicaments : vérifiez TOUJOURS les notices',
          '• Chaleur + alcool = déshydratation sévère',
          '• Fatigue + alcool = effet démultiplié'
        ],
        fact: '1 accident sur 3 implique un mélange alcool + autre chose !'
      });
    }

    // === CARTES CONDITIONNELLES MODÉRÉ (SUCCESS) ===
    if (userTodayUnits > 0 && userTodayUnits < 4) {
      allCards.push({
        type: 'success',
        icon: 'checkmark-circle',
        color: colors.success,
        title: 'Consommation modérée',
        main: `Avec ${userTodayUnits} unité${userTodayUnits > 1 ? 's' : ''}, vous gardez le contrôle !${bloodAlcohol > 0.1 ? ` Alcoolémie: ~${bloodAlcohol.toFixed(3)}g/L` : ''}`,
        items: [
          '• L\'alcool améliore temporairement l\'humeur',
          '• Vos réflexes restent normaux',
          `• Élimination dans ${Math.ceil(eliminationTime)}h`
        ],
        fact: 'Saviez-vous que l\'alcool amplifie la perception musicale ? C\'est pourquoi les concerts semblent encore meilleurs !'
      });
    }

    if (userTodayUnits >= 2 && userTodayUnits <= 3) {
      allCards.push({
        type: 'success',
        icon: 'happy',
        color: colors.success,
        title: 'Sweet spot social',
        main: 'Vous êtes dans la zone optimale de socialisation !',
        items: [
          '• +30% de confiance en soi',
          '• Inhibitions réduites mais jugement intact',
          '• Parfait pour rencontrer de nouvelles personnes'
        ],
        fact: '2-3 verres est le "sweet spot" scientifique de la fête !'
      });
    }

    if (userTodayUnits >= 1 && userTodayUnits <= 2) {
      allCards.push({
        type: 'success',
        icon: 'time',
        color: colors.success,
        title: 'Rythme parfait',
        main: 'Votre rythme de consommation est idéal pour profiter longtemps',
        items: [
          '• Vous pouvez maintenir ce niveau 4-6h',
          '• Risque minimal d\'effets négatifs',
          '• Mémoire et coordination préservées'
        ],
        fact: 'Les centenaires méditerranéens boivent 1-2 verres de vin/jour !'
      });
    }

    // === CARTES FIXES INFO ===
    const infoCards: CarouselCard[] = [
      {
        type: 'info',
        icon: 'globe',
        color: colors.info,
        title: 'Festivals dans le monde',
        main: 'Plus de 50 000 festivals de musique ont lieu chaque année dans le monde',
        items: [
          '• Le Oktoberfest sert 7 millions de litres de bière',
          '• Coachella génère 100M$ de retombées économiques',
          '• Rock am Ring détient le record: 900 000 visiteurs'
        ],
        fact: 'Le premier festival de musique moderne était Newport Folk Festival en 1959 !'
      },
      {
        type: 'info',
        icon: 'flash',
        color: colors.info,
        title: 'Records de festivals',
        main: 'Le festival le plus long du monde dure 10 jours consécutifs',
        items: [
          '• 1 festivalier consomme en moyenne 12L de liquide/jour',
          '• Les toilettes portables sont nettoyées 40 fois/jour',
          '• Un festival génère le même déchet qu\'une ville de 50 000 hab'
        ],
        fact: 'Woodstock 1969 était prévu pour 50 000 personnes... 400 000 sont venues !'
      },
      {
        type: 'info',
        icon: 'phone-portrait',
        color: colors.info,
        title: 'Technologie festivalière',
        main: 'Les bracelets RFID des festivals contiennent plus de technologie qu\'Apollo 11',
        items: [
          '• Un bracelet peut stocker jusqu\'à 2000 transactions',
          '• Les cashless systems réduisent les files de 60%',
          '• 95% des festivals utilisent maintenant la géolocalisation'
        ],
        fact: 'Le premier festival 100% cashless était Mysteryland en 2013 !'
      },
      {
        type: 'info',
        icon: 'cash',
        color: colors.info,
        title: 'Économie des festivals',
        main: 'Un festivalier dépense en moyenne 278€ par festival (hors billet)',
        items: [
          '• 40% du budget part en nourriture et boissons',
          '• Les merchandising rapportent 15€ par personne',
          '• Un festival crée 1 emploi pour 150 visiteurs'
        ],
        fact: 'Tomorrowland génère 100M€ de retombées pour la Belgique en 2 weekends !'
      },
      {
        type: 'info',
        icon: 'rainy',
        color: colors.info,
        title: 'Météo et festivals',
        main: '73% des festivals ont un plan B météo qui coûte 15% du budget total',
        items: [
          '• La pluie augmente les ventes de bière de 20%',
          '• Les orages causent 40% des annulations',
          '• Une canicule double la consommation d\'eau'
        ],
        fact: 'Glastonbury a son propre microclimat à cause de la foule !'
      },
      {
        type: 'info',
        icon: 'book',
        color: colors.info,
        title: 'Histoire musicale',
        main: 'Le plus vieux festival encore actif date de 1876 (Bayreuth Festival)',
        items: [
          '• Les festivals modernes sont nés dans les années 60',
          '• Le concept de "headliner" date de 1967',
          '• Les food trucks sont apparus en festival en 1974'
        ],
        fact: 'Le terme "festival" vient du latin "festivus" qui signifie "joyeux" !'
      },
      {
        type: 'info',
        icon: 'bus',
        color: colors.info,
        title: 'Transports festivaliers',
        main: '65% des festivaliers utilisent des transports partagés pour rentrer',
        items: [
          '• Les navettes évitent 12 000 tonnes de CO2/an',
          '• Le covoiturage a augmenté de 300% en 10 ans',
          '• 1 bus remplace 50 voitures sur les parkings'
        ],
        fact: 'Burning Man organise un aéroport temporaire qui gère 1000 vols privés !'
      },
      {
        type: 'info',
        icon: 'home',
        color: colors.info,
        title: 'Camping festival',
        main: '2,3 millions de tentes sont abandonnées chaque année en festival',
        items: [
          '• Une tente moyenne survit à 3 festivals max',
          '• 60% des festivaliers dorment moins de 4h/nuit',
          '• Les zones calmes augmentent de 40% chaque année'
        ],
        fact: 'Le record de la plus grande tente de festival : 3000 personnes à Roskilde !'
      },
      {
        type: 'info',
        icon: 'volume-high',
        color: colors.info,
        title: 'Sound systems',
        main: 'Un festival utilise assez d\'électricité pour alimenter 2000 foyers/an',
        items: [
          '• Les basses peuvent être ressenties jusqu\'à 10km',
          '• Un concert génère 110-140 décibels (seuil douleur: 120)',
          '• Les line arrays modernes portent le son à 500m'
        ],
        fact: 'Le Mur du Son du Hellfest pèse 60 tonnes et compte 96 enceintes !'
      },
      {
        type: 'info',
        icon: 'star',
        color: colors.info,
        title: 'Artistes et cachets',
        main: 'Le cachet moyen d\'une tête d\'affiche est passé de 50k€ à 500k€ en 20 ans',
        items: [
          '• Un DJ star peut gagner 1M€ pour 2h de set',
          '• Les artistes émergents jouent souvent gratuitement',
          '• Le merchandising rapporte plus que les cachets'
        ],
        fact: 'Prince a joué 2h de rappels à Coachella car il "s\'amusait trop" !'
      }
    ];

    // === CARTES FIXES SANTÉ ===
    const healthCards: CarouselCard[] = [
      {
        type: 'warning',
        icon: 'body',
        color: colors.warning,
        title: 'Alcool & Cerveau',
        main: 'Même sobre, votre cerveau fabrique naturellement 3g d\'alcool par jour',
        items: [
          '• L\'alcool traverse la barrière hémato-encéphalique en 30s',
          '• Il agit sur 40 neurotransmetteurs différents',
          '• Les femmes ont 20% moins d\'enzyme de dégradation'
        ],
        fact: 'L\'alcool est la seule drogue qu\'on peut absorber par la peau ! (mais très inefficace)'
      },
      {
        type: 'warning',
        icon: 'water',
        color: colors.warning,
        title: 'Hydratation en festival',
        main: 'La déshydratation cause 40% des malaises en festival',
        items: [
          '• Alcool + chaleur = perte de 2L d\'eau/jour',
          '• 1 bière = besoin de 250ml d\'eau pour compenser',
          '• Les électrolytes sont vos meilleurs amis'
        ],
        fact: 'Un festivalier urine en moyenne 8 fois par jour... prévoyez les files !'
      },
      {
        type: 'warning',
        icon: 'moon',
        color: colors.warning,
        title: 'Sommeil et récupération',
        main: '72h sans sommeil équivalent à 1g/L d\'alcoolémie niveau réflexes',
        items: [
          '• Le manque de sommeil amplifie les effets de l\'alcool',
          '• Les siestes de 20min restaurent 50% des capacités',
          '• La mélatonine est perturbée pendant 1 semaine'
        ],
        fact: 'Les festivals finlandais ont des "zones sieste" obligatoires depuis 2010 !'
      },
      {
        type: 'warning',
        icon: 'nutrition',
        color: colors.warning,
        title: 'Nutrition festivalière',
        main: 'Votre corps brûle 4000 calories/jour en festival (vs 2000 normal)',
        items: [
          '• Danser = 400-600 cal/heure',
          '• L\'alcool apporte 7 cal/g (presque autant que le gras)',
          '• Les protéines réduisent la gueule de bois de 30%'
        ],
        fact: 'Le kebab est scientifiquement le meilleur anti-gueule de bois !'
      },
      {
        type: 'warning',
        icon: 'ear',
        color: colors.warning,
        title: 'Audition et décibels',
        main: '1 festival sans protection = vieillissement auditif de 8 ans',
        items: [
          '• Les acouphènes touchent 1 festivalier sur 3',
          '• Les bouchons réduisent de 20-30 dB',
          '• La récupération auditive prend 16-48h'
        ],
        fact: 'Beethoven était sourd mais "sentait" la musique par les vibrations !'
      },
      {
        type: 'warning',
        icon: 'shield-checkmark',
        color: colors.warning,
        title: 'Système immunitaire',
        main: 'Votre immunité chute de 70% après 3 jours de festival',
        items: [
          '• Le "flu festival" touche 1 personne sur 5',
          '• Les bactéries doublent toutes les 4h sur les gobelets',
          '• Se laver les mains réduit les risques de 60%'
        ],
        fact: 'La "grippe de Coachella" a sa propre page Wikipedia !'
      },
      {
        type: 'warning',
        icon: 'flask',
        color: colors.warning,
        title: 'Effets cocktails',
        main: 'Mélanger alcool + caféine masque 40% des signes d\'ivresse',
        items: [
          '• Red Bull + vodka = fausse sensation de sobriété',
          '• Le sucre accélère l\'absorption d\'alcool',
          '• Cannabis + alcool = risque de malaise x5'
        ],
        fact: 'Les boissons énergisantes sont interdites avec l\'alcool au Canada !'
      }
    ];

    // === CARTES FIXES SOCIAL ===
    const socialCards: CarouselCard[] = [
      {
        type: 'primary',
        icon: 'people',
        color: colors.primary,
        title: 'Psychologie des groupes',
        main: 'En festival, vous prenez des décisions 40% plus risquées qu\'en temps normal',
        items: [
          '• L\'effet de groupe diminue l\'inhibition',
          '• Vous dansez 60% plus longtemps en groupe',
          '• La synchronisation crée des liens sociaux durables'
        ],
        fact: 'C\'est pourquoi tracker sa consommation avec des amis est si efficace !'
      },
      {
        type: 'primary',
        icon: 'heart',
        color: colors.primary,
        title: 'Rencontres festivalières',
        main: '1 couple sur 8 s\'est rencontré en festival ou concert',
        items: [
          '• Les goûts musicaux communs = +73% de compatibilité',
          '• 45% des amitiés festival durent plus d\'un an',
          '• Le "festival friend" est un phénomène psychologique étudié'
        ],
        fact: 'Tinder enregistre 400% de swipes en plus pendant les festivals !'
      },
      {
        type: 'primary',
        icon: 'walk',
        color: colors.primary,
        title: 'Comportements de foule',
        main: 'Une foule devient "liquide" à partir de 6 personnes/m²',
        items: [
          '• Les mouvements de foule suivent les lois de la physique',
          '• Un poggo génère une force de 2 tonnes',
          '• La "vague" parcourt 20m/seconde'
        ],
        fact: 'Le plus grand cercle de poggo : 5000 personnes à Hellfest 2019 !'
      },
      {
        type: 'primary',
        icon: 'hand-left',
        color: colors.primary,
        title: 'Communication non-verbale',
        main: '93% de la communication en festival est non-verbale',
        items: [
          '• Un sourire est reconnu à 100m dans la foule',
          '• Les gestes universels doublent en festival',
          '• Le langage des signes festivalier compte 50 gestes'
        ],
        fact: 'Le "metal horns" 🤘 a été popularisé par Ronnie James Dio !'
      },
      {
        type: 'primary',
        icon: 'swap-horizontal',
        color: colors.primary,
        title: 'Économie sociale',
        main: 'L\'entraide fait économiser 30% du budget moyen d\'un festivalier',
        items: [
          '• Partage de tente = -50€ par personne',
          '• Coolers communs = -40% gaspillage',
          '• Le troc représente 10% des échanges'
        ],
        fact: 'Le Rainbow Gathering fonctionne 100% sans argent depuis 1972 !'
      },
      {
        type: 'primary',
        icon: 'bonfire',
        color: colors.primary,
        title: 'Rituels festivaliers',
        main: '87% des festivaliers ont au moins un rituel personnel',
        items: [
          '• Le bracelet souvenir est gardé 6 mois en moyenne',
          '• 1 personne sur 3 a un "totem" de groupe',
          '• Les chants collectifs libèrent de l\'ocytocine'
        ],
        fact: 'Le cri "Olé Olé" vient des arènes espagnoles du 18ème siècle !'
      }
    ];

    // === CARTES FIXES CULTURE ===
    const cultureCards: CarouselCard[] = [
      {
        type: 'secondary',
        icon: 'musical-notes',
        color: colors.secondary,
        title: 'Science & Festivals',
        main: 'La musique live active 5 zones différentes de votre cerveau simultanément',
        items: [
          '• Votre cœur synchronise son rythme sur la musique',
          '• Les basses fréquences sont ressenties dans tout le corps',
          '• La foule amplifie les émotions de 300%'
        ],
        fact: 'Les concerts activent les mêmes zones cérébrales que les drogues et... l\'amour !'
      },
      {
        type: 'secondary',
        icon: 'restaurant',
        color: colors.secondary,
        title: 'Gastronomie festivalière',
        main: 'Les food trucks de festivals servent 15 000 repas par jour en moyenne',
        items: [
          '• La bouffe épicée réduit les effets de l\'alcool',
          '• Les glucides ralentissent l\'absorption d\'alcool de 25%',
          '• Manger gras AVANT de boire est plus efficace qu\'après'
        ],
        fact: 'Le sandwich le plus vendu en festival ? Le classique jambon-beurre !'
      },
      {
        type: 'secondary',
        icon: 'shirt',
        color: colors.secondary,
        title: 'Fashion festival',
        main: 'L\'industrie de la mode festival génère 2,3 milliards € par an',
        items: [
          '• 65% des festivaliers achètent une tenue spéciale',
          '• Les paillettes représentent 40 tonnes de déchets/an',
          '• Instagram influence 80% des choix vestimentaires'
        ],
        fact: 'Les bottes en caoutchouc sont devenues fashion grâce à Kate Moss à Glastonbury !'
      },
      {
        type: 'secondary',
        icon: 'color-palette',
        color: colors.secondary,
        title: 'Art et installations',
        main: 'Un festival moyen expose 50 œuvres d\'art pour 0 musée',
        items: [
          '• Le land art festival représente 30% du budget déco',
          '• 1 installation sur 3 devient permanente',
          '• Les artistes visuels = 20% des pass artistes'
        ],
        fact: 'La sculpture "LOVE" de Burning Man a nécessité 1 an de construction !'
      },
      {
        type: 'secondary',
        icon: 'leaf',
        color: colors.secondary,
        title: 'Environnement et écologie',
        main: 'Les éco-festivals ont réduit leur empreinte carbone de 50% en 10 ans',
        items: [
          '• 1 gobelet réutilisable = 150 gobelets jetables',
          '• Les toilettes sèches économisent 10M litres d\'eau',
          '• 30% des festivals sont alimentés en énergie verte'
        ],
        fact: 'Shambala Festival est 100% végétarien depuis 2016 pour l\'environnement !'
      },
      {
        type: 'secondary',
        icon: 'globe-outline',
        color: colors.secondary,
        title: 'Diversité musicale',
        main: 'Un festival programme en moyenne 14 genres musicaux différents',
        items: [
          '• La world music a augmenté de 200% en 10 ans',
          '• 40% des têtes d\'affiche sont maintenant des DJ',
          '• Les genres fusionnent 3x plus vite qu\'avant'
        ],
        fact: 'Le didgeridoo électronique est né à Glastonbury en 1997 !'
      }
    ];

    // Ajouter toutes les cartes fixes
    allCards.push(...infoCards, ...healthCards, ...socialCards, ...cultureCards);

    // Mélanger les cartes fixes pour plus de variété
    const fixedCardsStartIndex = allCards.length - (infoCards.length + healthCards.length + socialCards.length + cultureCards.length);
    const fixedCards = allCards.slice(fixedCardsStartIndex);
    for (let i = fixedCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [fixedCards[i], fixedCards[j]] = [fixedCards[j], fixedCards[i]];
    }
    allCards.splice(fixedCardsStartIndex, fixedCards.length, ...fixedCards);

    setCarouselData(allCards);
    if (carouselIndex >= allCards.length) {
      setCarouselIndex(0);
    }
  }, [userTodayUnits, userProfile, colors]);

  const currentCard = carouselData[carouselIndex];
  if (!currentCard) return null;

  const handlePrevious = () => {
    setCarouselIndex(carouselIndex > 0 ? carouselIndex - 1 : carouselData.length - 1);
  };

  const handleNext = () => {
    setCarouselIndex(carouselIndex < carouselData.length - 1 ? carouselIndex + 1 : 0);
  };

  const handleDotPress = (index: number) => {
    setCarouselIndex(index);
  };

  const handleSwipeGesture = (event: any) => {
    if (event.nativeEvent.state === GestureState.END) {
      const { translationX, translationY } = event.nativeEvent;
      
      // Si le swipe vertical est plus important que horizontal, laisser le scroll
      if (Math.abs(translationY) > Math.abs(translationX)) {
        return;
      }
      
      // Seuil de 50px pour déclencher le swipe horizontal
      if (Math.abs(translationX) > 50) {
        if (translationX > 0) {
          // Swipe vers la droite = slide précédent
          handlePrevious();
        } else {
          // Swipe vers la gauche = slide suivant
          handleNext();
        }
      }
    }
  };

  // Fonction pour obtenir les couleurs du dégradé
  const getGradientColors = (baseColor: string) => {
    // Créer des variations plus claires et plus foncées de la couleur de base
    return [baseColor + '15', baseColor + '25', baseColor + '10'];
  };

  // Fonction pour obtenir le label du type de carte
  const getTypeLabel = (type: string) => {
    const labels = {
      'danger': 'Sécurité',
      'warning': 'Santé',
      'success': 'Modéré',
      'info': 'Info',
      'primary': 'Social',
      'secondary': 'Culture'
    };
    return labels[type as keyof typeof labels] || 'Info';
  };

  return (
    <PanGestureHandler 
      onHandlerStateChange={handleSwipeGesture}
      activeOffsetX={[-10, 10]}
      failOffsetY={[-20, 20]}
    >
      <View>
        <LinearGradient
          colors={getGradientColors(currentCard.color)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.knowledgeHeader}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconContainer, { backgroundColor: currentCard.color }]}>
                <Ionicons name={currentCard.icon as any} size={20} color="#ffffff" />
              </View>
              <View style={styles.titleContainer}>
                <View style={[styles.typeBadge, { backgroundColor: currentCard.color + '30' }]}>
                  <Text style={[styles.typeLabel, { color: currentCard.color }]}>
                    {getTypeLabel(currentCard.type)}
                  </Text>
                </View>
                <Text style={[styles.knowledgeTitle, { color: currentCard.color }]}>
                  {currentCard.title}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>
        
        <View style={styles.knowledgeContent}>
          <Text style={[styles.knowledgeMainText, { color: colors.text }]}>
            {currentCard.main}
          </Text>
          <View style={styles.knowledgeList}>
            {currentCard.items.map((item: string, index: number) => (
              <Text key={index} style={[styles.knowledgeListItem, { color: colors.textLight }]}>
                {item}
              </Text>
            ))}
          </View>
          <Text style={[styles.knowledgeFact, { color: colors.textLight }]}>
            💡 <Text style={{ fontStyle: 'italic' }}>{currentCard.fact}</Text>
          </Text>
        </View>

        {/* Navigation du carousel simplifiée */}
        <View style={styles.carouselNavigation}>
          <View style={styles.navigationInfo}>
            <Text style={[styles.slideCounter, { color: colors.textLight }]}>
              {carouselIndex + 1} / {carouselData.length}
            </Text>
            <Text style={[styles.swipeHint, { color: colors.textLight }]}>
              ← Glissez pour naviguer →
            </Text>
          </View>
          
          <View style={styles.compactDotsContainer}>
            {/* Afficher seulement 5 dots : 2 avant, actuel, 2 après */}
            {(() => {
              const totalDots = carouselData.length;
              const currentIndex = carouselIndex;
              const visibleRange = 2; // Nombre de dots de chaque côté
              
              let startIndex = Math.max(0, currentIndex - visibleRange);
              let endIndex = Math.min(totalDots - 1, currentIndex + visibleRange);
              
              // Ajuster pour avoir toujours 5 dots si possible
              if (endIndex - startIndex < 4 && totalDots > 5) {
                if (startIndex === 0) {
                  endIndex = Math.min(totalDots - 1, 4);
                } else if (endIndex === totalDots - 1) {
                  startIndex = Math.max(0, totalDots - 5);
                }
              }
              
              const dotsToShow = [];
              for (let i = startIndex; i <= endIndex; i++) {
                dotsToShow.push(i);
              }
              
              return dotsToShow.map((index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleDotPress(index)}
                  style={[
                    styles.compactDot,
                    {
                      backgroundColor: index === carouselIndex ? currentCard.color : colors.border,
                      width: index === carouselIndex ? 16 : 6,
                      opacity: index === carouselIndex ? 1 : 0.5,
                    }
                  ]}
                />
              ));
            })()}
          </View>
        </View>
      </View>
    </PanGestureHandler>
  );
}

const styles = StyleSheet.create({
  knowledgeHeader: {
    marginBottom: 0,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden'
  },
  headerContent: {
    padding: 16,
    paddingVertical: 20
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3
  },
  titleContainer: {
    flex: 1,
    gap: 6
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  knowledgeTitle: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 22,
    letterSpacing: -0.2
  },
  knowledgeContent: {
    padding: 16,
    paddingTop: 0
  },
  knowledgeMainText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
    fontWeight: '500'
  },
  knowledgeList: {
    marginBottom: 12
  },
  knowledgeListItem: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 4
  },
  knowledgeFact: {
    fontSize: 13,
    lineHeight: 18,
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#dee2e6'
  },
  carouselNavigation: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    alignItems: 'center'
  },
  navigationInfo: {
    alignItems: 'center',
    marginBottom: 8
  },
  slideCounter: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2
  },
  swipeHint: {
    fontSize: 10,
    fontStyle: 'italic'
  },
  compactDotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  compactDot: {
    height: 6,
    borderRadius: 3
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center'
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
    justifyContent: 'center'
  },
  dot: {
    height: 8,
    borderRadius: 4,
    transition: 'width 0.3s ease'
  }
});