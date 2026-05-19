import { Question } from './types';

export const ETHIOPIAN_GRADE_10_QUESTIONS: Question[] = [
  // --- PHYSICS QUESTIONS ---
  {
    id: 1,
    subject: 'Physics',
    topic: 'Electrostatics',
    text: 'According to Coulomb\'s Law, if the distance between two point charges is halved, how does the electrostatic force between them change?',
    options: [
      'The force becomes half of the original value.',
      'The force becomes double the original value.',
      'The force decreases to one-fourth of the original value.',
      'The force increases to four times the original value.'
    ],
    correctAnswerIndex: 3,
    explanation: 'Coulomb\'s Law states that F = k * (q1 * q2) / r². Since force is inversely proportional to the square of the distance (r²), halving the distance (r/2) results in the force increasing by (1 / 0.5²) = 4 times. (Ethiopian Curriculum Unit 3: Electrostatics).'
  },
  {
    id: 2,
    subject: 'Physics',
    topic: 'Electromagnetism',
    text: 'Which rule or law is used to determine the direction of the induced electromotive force (EMF) in a conductor moving through a magnetic field?',
    options: [
      'Coulomb\'s Law',
      'Lenz\'s Law',
      'Ohm\'s Law',
      'Joule\'s Law'
    ],
    correctAnswerIndex: 1,
    explanation: 'Lenz\'s Law states that the direction of an induced current is always such that it opposes the change in magnetic flux that produced it. It is a direct consequence of the conservation of energy. (Ethiopian Curriculum Unit 4).'
  },
  {
    id: 3,
    subject: 'Physics',
    topic: 'Motion in Two Dimensions',
    text: 'In projectile motion (ignoring air resistance), which of the following statements about velocity and acceleration is correct at the highest point of flight?',
    options: [
      'Both velocity and acceleration are zero.',
      'Vertical velocity is zero, and acceleration is vertical (g).',
      'Horizontal velocity is zero, and vertical acceleration is zero.',
      'Vertical velocity is zero, and vertical acceleration is zero.'
    ],
    correctAnswerIndex: 1,
    explanation: 'At the highest point of projectile motion, the vertical velocity (Vy) decreases to zero, while the horizontal velocity remains constant (Vx = V * cosθ). The acceleration remains constant throughout the flight, equal to gravity (g) pointing downwards. (Ethiopian Curriculum Unit 2).'
  },
  {
    id: 4,
    subject: 'Physics',
    topic: 'Physical Quantities',
    text: 'Which of the following physical quantities is a scalar quantity?',
    options: [
      'Acceleration',
      'Momentum',
      'Electric Potential',
      'Magnetic Field Intensity'
    ],
    correctAnswerIndex: 2,
    explanation: 'Electric Potential is a scalar physical quantity (measured in volts), only having magnitude. Acceleration, Momentum, and Magnetic Field Intensity are vectors, requiring both magnitude and direction. (Ethiopian Curriculum Unit 1).'
  },
  {
    id: 5,
    subject: 'Physics',
    topic: 'Electromagnetism',
    text: 'A straight wire carries current towards the top of the page. What is the direction of the magnetic field on the right side of the wire?',
    options: [
      'Into the page',
      'Out of the page',
      'Towards the top of the page',
      'Towards the bottom of the page'
    ],
    correctAnswerIndex: 0,
    explanation: 'Using the Right-Hand Rule, place your thumb pointing along the current (upwards). Your curled fingers point "into the page" on the right side of the wire, and "out of the page" on the left side. (Ethiopian Curriculum Unit 4).'
  },

  // --- CHEMISTRY QUESTIONS ---
  {
    id: 101,
    subject: 'Chemistry',
    topic: 'Saturated Hydrocarbons',
    text: 'What is the general molecular formula for alkanes (saturated hydrocarbons)?',
    options: [
      'C_n H_2n',
      'C_n H_2n-2',
      'C_n H_2n+2',
      'C_n H_n'
    ],
    correctAnswerIndex: 2,
    explanation: 'The general formula for saturated hydrocarbons (alkanes like Methane, Ethane, Propane) is C_n H_2n+2. Alkenes use C_n H_2n and Alkynes use C_n H_2n-2. (Ethiopian Grade 10 Chemistry Unit 2).'
  },
  {
    id: 102,
    subject: 'Chemistry',
    topic: 'Oxygen-Containing Organic Compounds',
    text: 'An esterification reaction occurs when which of the following functional groups react together in the presence of an acid catalyst?',
    options: [
      'An Alkane and an Alkene',
      'A Carboxylic Acid and an Alcohol',
      'An Aldehyde and an Alkynes',
      'An Ether and a Ketone'
    ],
    correctAnswerIndex: 1,
    explanation: 'Esterification is the reaction between a Carboxylic Acid (-COOH) and an Alcohol (-OH) to produce an Ester (-COO-) and water, usually catalyzed by sulfuric acid. (Ethiopian Grade 10 Chemistry Unit 4).'
  },
  {
    id: 103,
    subject: 'Chemistry',
    topic: 'Unsaturated Hydrocarbons',
    text: 'Which chemical reagent is typically used as a simple lab test to distinguish an unsaturated hydrocarbon (alkene) from a saturated one?',
    options: [
      'Bromine water (Br_2 / H_2O)',
      'Sodium hydroxide (NaOH)',
      'Hydrochloric acid (HCl)',
      'Litmus paper indicator'
    ],
    correctAnswerIndex: 0,
    explanation: 'Alkenes undergo rapid addition reactions with bromine water, decoloring its reddish-brown color instantly. Alkanes do not react with bromine unless exposed to light. (Ethiopian Grade 10 Chemistry Unit 3).'
  },
  {
    id: 104,
    subject: 'Chemistry',
    topic: 'Saturated Hydrocarbons',
    text: 'What is the main chemical constituent of natural gas and the primary fossil fuel used in many refinery operations in Ethiopia?',
    options: [
      'Ethanol',
      'Butane',
      'Acetylene',
      'Methane'
    ],
    correctAnswerIndex: 3,
    explanation: 'Methane (CH4) is the simplest alkane and the primary component (up to 90%) of natural gas. It is extensively covered as the starting point of saturated hydrocarbons. (Grade 10 Unit 2).'
  },
  {
    id: 105,
    subject: 'Chemistry',
    topic: 'Alcohols',
    text: 'What is the correct IUPAC name for CH3-CH2-CH2-OH?',
    options: [
      'Methanol',
      'Ethanol',
      '1-Propanol',
      '2-Propanol'
    ],
    correctAnswerIndex: 2,
    explanation: 'CH3-CH2-CH2-OH contains three carbons in its longest continuous chain with the -OH group attached to carbon-1. Hence, its IUPAC name is 1-Propanol. (Grade 10 Unit 4).'
  },

  // --- BIOLOGY QUESTIONS ---
  {
    id: 201,
    subject: 'Biology',
    topic: 'Sub-fields of Biology',
    text: 'Which branch of applied biology uses living organisms, cells, or biological systems to produce medicines, modify crop genetics, or treat industrial pollutants?',
    options: [
      'Botany',
      'Biotechnology',
      'Ecology',
      'Paleontology'
    ],
    correctAnswerIndex: 1,
    explanation: 'Biotechnology is an applied science that integrates biological research with technology to generate solutions like transgenic crops and insulin. Unit 1 explores this as a major modern subfield of biology. (Ethiopian Grade 10 Unit 1).'
  },
  {
    id: 202,
    subject: 'Biology',
    topic: 'Plants (Angiosperms)',
    text: 'Which vascular tissue in plants is specifically responsible for the transport of water and dissolved minerals upwards from the roots to the leaves?',
    options: [
      'Phloem',
      'Xylem',
      'Cortex',
      'Epidermis'
    ],
    correctAnswerIndex: 1,
    explanation: 'Xylem is the specialized dead vascular tissue consisting of tracheids and vessel elements that transports water and inorganic salts. Phloem transports synthesized organic foods (sugars). (Grade 10 Unit 2).'
  },
  {
    id: 203,
    subject: 'Biology',
    topic: 'Animals & Human Biology',
    text: 'In the human circulatory system, which blood vessels carry oxygenated blood away from the left ventricle of the heart to the rest of the body cells?',
    options: [
      'Pulmonary Arteries',
      'Pulmonary Veins',
      'Vena Cava',
      'Aorta & Systemic Arteries'
    ],
    correctAnswerIndex: 3,
    explanation: 'The left ventricle pumps oxygen-rich blood into the Aorta, the largest artery in the body, which branches into systemic arteries to deliver blood to tissues. (Grade 10 Unit 3).'
  },
  {
    id: 204,
    subject: 'Biology',
    topic: 'Ecology & Environmental Issues',
    text: 'What is the primary ecological role of decomposers (like bacteria and fungi) in an Ethiopian savanna ecosystem?',
    options: [
      'To produce energy from sunlight',
      'To recycle inorganic nutrients back into the soil',
      'To control the population of apex predators',
      'To capture carbon dioxide through cellular respiration'
    ],
    correctAnswerIndex: 1,
    explanation: 'Decomposers break down dead organic matter and waste material, releasing essential inorganic nutrients (like nitrogen and phosphorus) back into the soil for producers to reuse. (Grade 10 Unit 4).'
  },
  {
    id: 205,
    subject: 'Biology',
    topic: 'Plants',
    text: 'What is the principal site of photosynthesis in plant leaves, consisting of cells highly concentrated with chloroplasts?',
    options: [
      'Cuticle layer',
      'Mesophyll tissue (Palisade and Spongy)',
      'Stomata openings',
      'Vascular bundles'
    ],
    correctAnswerIndex: 1,
    explanation: 'The mesophyll layers, especially the palisade mesophyll, contain the columns of vertically elongated cells packed with chloroplasts ideal for light absorption. (Grade 10 Unit 2).'
  }
];
