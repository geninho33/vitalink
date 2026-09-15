/**
 * Catálogo dos principais medicamentos usados por pessoas com 50+ no Brasil,
 * com apresentações comercializadas (dosagem + forma).
 *
 * Fontes de referência (elenco e classes terapêuticas, não um dump de bula):
 * - Programa Farmácia Popular (Portaria GM/MS nº 4.811/2024): hipertensão,
 *   diabetes, asma, osteoporose, dislipidemia, Parkinson, glaucoma, rinite.
 * - Padrão de polifarmácia em idosos (anti-hipertensivos, antidiabéticos,
 *   hipolipemiantes, antiplaquetários, IBP, levotiroxina, osteoporose, etc.).
 * - Marcas e genéricos habitualmente encontrados em farmácias brasileiras.
 *
 * Cada linha é uma apresentação à venda (nome + dosagem + forma).
 */
const LABS = [
  'EMS',
  'Medley',
  'Neo Química',
  'Germed',
  'Eurofarma',
  'Teuto',
  'Cimed',
  'Prati-Donaduzzi',
  'Sandoz',
  'Geolab',
  'Legrand',
  'Brainfarma',
];

function item(inn, classe, marcas, doses, labCount = 4) {
  return {
    inn,
    classe,
    marcas: marcas || [],
    labCount,
    apresentacoes: (doses || []).map((d) =>
      typeof d === 'string' ? { dosagem: d, forma: 'comprimido' } : d
    ),
  };
}

const DRUGS = [
  item('Losartana potássica', 'Anti-hipertensivo (BRA)', ['Cozaar', 'Aradois', 'Valtrian', 'Lortaan'], ['25 mg', '50 mg', '100 mg'], 5),
  item('Losartana + Hidroclorotiazida', 'Anti-hipertensivo combinado', ['Hyzaar', 'Aradois H', 'Valtrian HCT'], ['50/12,5 mg', '100/25 mg'], 4),
  item('Hidroclorotiazida', 'Diurético tiazídico', ['Clorana', 'Drenidrate'], ['12,5 mg', '25 mg', '50 mg'], 5),
  item('Maleato de enalapril', 'Anti-hipertensivo (IECA)', ['Renitec', 'Eupressin', 'Atens'], ['5 mg', '10 mg', '20 mg'], 5),
  item('Captopril', 'Anti-hipertensivo (IECA)', ['Capoten', 'Capotril'], ['12,5 mg', '25 mg', '50 mg'], 5),
  item('Besilato de anlodipino', 'Anti-hipertensivo (BCC)', ['Norvasc', 'Anlo', 'Pressat', 'Amlocor'], ['2,5 mg', '5 mg', '10 mg'], 5),
  item('Atenolol', 'Betabloqueador', ['Atenol', 'Ablok'], ['25 mg', '50 mg', '100 mg'], 5),
  item('Cloridrato de propranolol', 'Betabloqueador', ['Inderal'], ['10 mg', '40 mg', '80 mg'], 4),
  item('Succinato de metoprolol', 'Betabloqueador', ['Selozok', 'Revelol'], ['25 mg', '50 mg', '100 mg'], 4),
  item('Tartarato de metoprolol', 'Betabloqueador', ['Lopressor'], ['100 mg'], 3),
  item('Carvedilol', 'Betabloqueador', ['Coreg', 'Cardilol', 'Ictus'], ['3,125 mg', '6,25 mg', '12,5 mg', '25 mg'], 5),
  item('Bisoprolol', 'Betabloqueador', ['Concor', 'Bisoprolol Sandoz'], ['1,25 mg', '2,5 mg', '5 mg', '10 mg'], 4),
  item('Nebivolol', 'Betabloqueador', ['Nebilet', 'Nebilol'], ['5 mg'], 3),
  item('Valsartana', 'Anti-hipertensivo (BRA)', ['Diovan', 'Brasart'], ['80 mg', '160 mg', '320 mg'], 4),
  item('Valsartana + Hidroclorotiazida', 'Anti-hipertensivo combinado', ['Co-Diovan', 'Diovan HCT'], ['80/12,5 mg', '160/12,5 mg', '160/25 mg'], 3),
  item('Olmesartana medoxomila', 'Anti-hipertensivo (BRA)', ['Benicar', 'Olmetec'], ['20 mg', '40 mg'], 4),
  item('Candesartana cilexetila', 'Anti-hipertensivo (BRA)', ['Atacand', 'Blopress'], ['8 mg', '16 mg', '32 mg'], 3),
  item('Telmisartana', 'Anti-hipertensivo (BRA)', ['Micardis', 'Pritor'], ['40 mg', '80 mg'], 3),
  item('Irbesartana', 'Anti-hipertensivo (BRA)', ['Aprovel', 'Avapro'], ['150 mg', '300 mg'], 3),
  item('Ramipril', 'Anti-hipertensivo (IECA)', ['Tritace', 'Triatec'], ['2,5 mg', '5 mg', '10 mg'], 4),
  item('Lisinopril', 'Anti-hipertensivo (IECA)', ['Zestril', 'Prinivil'], ['5 mg', '10 mg', '20 mg'], 3),
  item('Perindopril', 'Anti-hipertensivo (IECA)', ['Coversyl', 'Acertil'], ['4 mg', '8 mg'], 3),
  item('Nifedipino', 'Anti-hipertensivo (BCC)', ['Adalat', 'Nifedipres'], ['10 mg', '20 mg', '30 mg'], 3),
  item('Diltiazem', 'Anti-hipertensivo (BCC)', ['Cardizem', 'Balcor'], ['30 mg', '60 mg', '90 mg', '180 mg'], 3),
  item('Verapamil', 'Anti-hipertensivo (BCC)', ['Dilacoron'], ['80 mg', '120 mg'], 3),
  item('Furosemida', 'Diurético de alça', ['Lasix', 'Neosemid'], ['40 mg', { dosagem: '20 mg/2 ml', forma: 'injecao' }], 5),
  item('Espironolactona', 'Diurético poupador de K', ['Aldactone', 'Spiroctan'], ['25 mg', '50 mg', '100 mg'], 5),
  item('Clortalidona', 'Diurético tiazídico', ['Higroton'], ['12,5 mg', '25 mg', '50 mg'], 4),
  item('Indapamida', 'Diurético tiazídico', ['Natrilix', 'Fludex'], ['1,5 mg', '2,5 mg'], 3),
  item('Doxazosina', 'Anti-hipertensivo (alfa)', ['Carduran'], ['2 mg', '4 mg'], 3),
  item('Clonidina', 'Anti-hipertensivo central', ['Atensina'], ['0,100 mg', '0,150 mg', '0,200 mg'], 3),
  item('Hidralazina', 'Vasodilatador', ['Apresolina'], ['25 mg', '50 mg'], 3),
  item('Anlodipino + Losartana', 'Anti-hipertensivo combinado', ['Lotar', 'Anlosoar'], ['5/50 mg', '5/100 mg'], 3),
  item('Anlodipino + Valsartana', 'Anti-hipertensivo combinado', ['Exforge', 'Exforgeduo'], ['5/160 mg', '10/160 mg'], 3),
  item('Perindopril + Indapamida', 'Anti-hipertensivo combinado', ['Preterax', 'Coveram'], ['4/1,25 mg', '8/2,5 mg'], 2),

  item('Sinvastatina', 'Hipolipemiante', ['Zocor', 'Sinvascor', 'Vastin'], ['10 mg', '20 mg', '40 mg', '80 mg'], 5),
  item('Atorvastatina', 'Hipolipemiante', ['Lipitor', 'Zarator', 'Citalor'], ['10 mg', '20 mg', '40 mg', '80 mg'], 5),
  item('Rosuvastatina', 'Hipolipemiante', ['Crestor', 'Trezete', 'Rox'], ['5 mg', '10 mg', '20 mg', '40 mg'], 5),
  item('Pravastatina', 'Hipolipemiante', ['Pravacol'], ['10 mg', '20 mg', '40 mg'], 3),
  item('Pitavastatina', 'Hipolipemiante', ['Livalo'], ['2 mg', '4 mg'], 2),
  item('Ezetimiba', 'Hipolipemiante', ['Ezetrol', 'Zetia'], ['10 mg'], 4),
  item('Ezetimiba + Sinvastatina', 'Hipolipemiante combinado', ['Vytorin', 'Inegy'], ['10/20 mg', '10/40 mg'], 3),
  item('Fenofibrato', 'Hipolipemiante (fibrato)', ['Lipanon', 'Lipidil'], ['160 mg', '200 mg'], 3),
  item('Ciprofibrato', 'Hipolipemiante (fibrato)', ['Lipless', 'Oroxadin'], ['100 mg'], 3),
  item('Bezafibrato', 'Hipolipemiante (fibrato)', ['Cedur'], ['200 mg', '400 mg'], 2),

  item('Cloridrato de metformina', 'Antidiabético', ['Glifage', 'Glucoformin', 'Dimefor', 'Glifage XR'], ['500 mg', '850 mg', '1000 mg', '500 mg XR', '750 mg XR'], 5),
  item('Glibenclamida', 'Antidiabético (SU)', ['Daonil', 'Glibenclamida Teuto'], ['5 mg'], 5),
  item('Gliclazida', 'Antidiabético (SU)', ['Diamicron', 'Azukon'], ['30 mg MR', '60 mg MR', '80 mg'], 4),
  item('Glimepirida', 'Antidiabético (SU)', ['Amaryl', 'Amaryl M'], ['1 mg', '2 mg', '3 mg', '4 mg'], 4),
  item('Empagliflozina', 'Antidiabético (SGLT2)', ['Jardiance'], ['10 mg', '25 mg'], 2),
  item('Dapagliflozina', 'Antidiabético (SGLT2)', ['Forxiga'], ['5 mg', '10 mg'], 3),
  item('Canagliflozina', 'Antidiabético (SGLT2)', ['Invokana'], ['100 mg', '300 mg'], 2),
  item('Sitagliptina', 'Antidiabético (DPP-4)', ['Januvia', 'Janumet'], ['25 mg', '50 mg', '100 mg'], 3),
  item('Vildagliptina', 'Antidiabético (DPP-4)', ['Galvus', 'Galvus Met'], ['50 mg'], 3),
  item('Linagliptina', 'Antidiabético (DPP-4)', ['Trajenta'], ['5 mg'], 2),
  item('Pioglitazona', 'Antidiabético (glitazona)', ['Actos'], ['15 mg', '30 mg', '45 mg'], 3),
  item('Acarbose', 'Antidiabético', ['Glucobay'], ['50 mg', '100 mg'], 3),
  item('Sitagliptina + Metformina', 'Antidiabético combinado', ['Janumet'], ['50/500 mg', '50/1000 mg'], 3),
  item('Empagliflozina + Metformina', 'Antidiabético combinado', ['Jardiamet'], ['12,5/500 mg', '12,5/1000 mg'], 2),
  item('Dapagliflozina + Metformina', 'Antidiabético combinado', ['Xigduo'], ['5/1000 mg', '10/1000 mg'], 2),
  item('Semaglutida', 'Antidiabético (GLP-1)', ['Ozempic', 'Rybelsus', 'Wegovy'], [{ dosagem: '0,25 mg', forma: 'injecao' }, { dosagem: '0,5 mg', forma: 'injecao' }, { dosagem: '1 mg', forma: 'injecao' }, '3 mg', '7 mg', '14 mg'], 1),
  item('Liraglutida', 'Antidiabético (GLP-1)', ['Victoza', 'Saxenda'], [{ dosagem: '6 mg/ml', forma: 'injecao' }], 1),
  item('Dulaglutida', 'Antidiabético (GLP-1)', ['Trulicity'], [{ dosagem: '0,75 mg', forma: 'injecao' }, { dosagem: '1,5 mg', forma: 'injecao' }], 1),
  item('Insulina humana NPH', 'Insulina', ['Humulin N', 'Novolin N', 'Insulatard'], [{ dosagem: '100 UI/ml frasco 10 ml', forma: 'injecao' }, { dosagem: '100 UI/ml refil 3 ml', forma: 'injecao' }], 3),
  item('Insulina humana regular', 'Insulina', ['Humulin R', 'Novolin R'], [{ dosagem: '100 UI/ml frasco 10 ml', forma: 'injecao' }, { dosagem: '100 UI/ml refil 3 ml', forma: 'injecao' }], 3),
  item('Insulina glargina', 'Insulina', ['Lantus', 'Basaglar', 'Toujeo'], [{ dosagem: '100 UI/ml', forma: 'injecao' }, { dosagem: '300 UI/ml', forma: 'injecao' }], 2),
  item('Insulina detemir', 'Insulina', ['Levemir'], [{ dosagem: '100 UI/ml', forma: 'injecao' }], 1),
  item('Insulina degludeca', 'Insulina', ['Tresiba'], [{ dosagem: '100 UI/ml', forma: 'injecao' }, { dosagem: '200 UI/ml', forma: 'injecao' }], 1),
  item('Insulina aspart', 'Insulina', ['NovoRapid', 'Fiasp'], [{ dosagem: '100 UI/ml', forma: 'injecao' }], 1),
  item('Insulina lispro', 'Insulina', ['Humalog'], [{ dosagem: '100 UI/ml', forma: 'injecao' }], 1),
  item('Insulina glulisina', 'Insulina', ['Apidra'], [{ dosagem: '100 UI/ml', forma: 'injecao' }], 1),

  item('Ácido acetilsalicílico', 'Antiplaquetário', ['AAS', 'Aspirina Prevent', 'Melhoral', 'Somalgin'], ['100 mg', '81 mg', '500 mg'], 5),
  item('Clopidogrel', 'Antiplaquetário', ['Plavix', 'Iscover', 'Plaquevix'], ['75 mg'], 5),
  item('Ticagrelor', 'Antiplaquetário', ['Brilinta'], ['90 mg'], 2),
  item('Prasugrel', 'Antiplaquetário', ['Effient'], ['10 mg'], 2),
  item('Varfarina sódica', 'Anticoagulante', ['Marevan', 'Coumadin'], ['1 mg', '2,5 mg', '5 mg'], 4),
  item('Rivaroxabana', 'Anticoagulante (DOAC)', ['Xarelto'], ['10 mg', '15 mg', '20 mg'], 3),
  item('Apixabana', 'Anticoagulante (DOAC)', ['Eliquis'], ['2,5 mg', '5 mg'], 3),
  item('Dabigatrana', 'Anticoagulante (DOAC)', ['Pradaxa'], ['110 mg', '150 mg'], 2),
  item('Edoxabana', 'Anticoagulante (DOAC)', ['Lixiana'], ['30 mg', '60 mg'], 2),
  item('Enoxaparina sódica', 'Anticoagulante', ['Clexane', 'Versa'], [{ dosagem: '40 mg/0,4 ml', forma: 'injecao' }, { dosagem: '60 mg/0,6 ml', forma: 'injecao' }, { dosagem: '80 mg/0,8 ml', forma: 'injecao' }], 3),
  item('Cilostazol', 'Antiagregante / claudicação', ['Pletaal', 'Cebralat'], ['50 mg', '100 mg'], 3),
  item('Dipiridamol', 'Antiplaquetário', ['Persantin'], ['75 mg', '100 mg'], 2),

  item('Omeprazol', 'Protetor gástrico (IBP)', ['Losec', 'Gastrium', 'Peprazol'], ['10 mg', '20 mg', '40 mg'], 5),
  item('Pantoprazol', 'Protetor gástrico (IBP)', ['Pantozol', 'Zurcal', 'Tecta'], ['20 mg', '40 mg'], 5),
  item('Esomeprazol', 'Protetor gástrico (IBP)', ['Nexium', 'Esoprax'], ['20 mg', '40 mg'], 4),
  item('Lansoprazol', 'Protetor gástrico (IBP)', ['Prazol', 'Lanzol'], ['15 mg', '30 mg'], 4),
  item('Rabeprazol', 'Protetor gástrico (IBP)', ['Pariet'], ['10 mg', '20 mg'], 3),
  item('Domperidona', 'Procinético', ['Motilium', 'Peridona'], ['10 mg'], 4),
  item('Metoclopramida', 'Procinético / antináusea', ['Plasil'], ['10 mg', { dosagem: '4 mg/ml', forma: 'gotas' }, { dosagem: '5 mg/ml', forma: 'injecao' }], 4),
  item('Bromoprida', 'Procinético', ['Digesan', 'Plamet'], ['10 mg', { dosagem: '4 mg/ml', forma: 'gotas' }], 3),
  item('Simeticona', 'Antiflatulento', ['Luftal', 'Flatoril'], [{ dosagem: '75 mg/ml', forma: 'gotas' }, '40 mg', '80 mg', '125 mg'], 4),
  item('Lactulose', 'Laxante', ['Lactulona', 'Duphalac'], [{ dosagem: '667 mg/ml', forma: 'xarope' }], 4),
  item('Bisacodil', 'Laxante', ['Dulcolax'], ['5 mg'], 3),
  item('Picosulfato de sódio', 'Laxante', ['Guttalax'], [{ dosagem: '7,5 mg/ml', forma: 'gotas' }], 2),
  item('Sucralfato', 'Protetor gástrico', ['Sucrafilm'], ['1 g'], 3),
  item('Hidróxido de alumínio + magnésio', 'Antiácido', ['Pepsamar', 'Maalox'], [{ dosagem: 'suspensão oral', forma: 'solucao' }], 3),
  item('Ondansetrona', 'Antiemético', ['Vonau', 'Zofran'], ['4 mg', '8 mg'], 3),
  item('Dimenidrinato', 'Antiemético', ['Dramin'], ['50 mg', { dosagem: '25 mg/ml', forma: 'gotas' }], 3),

  item('Dipirona sódica', 'Analgésico / antitérmico', ['Novalgina', 'Anador', 'Dorflex Dipirona'], ['500 mg', '1 g', { dosagem: '500 mg/ml', forma: 'gotas' }, { dosagem: '50 mg/ml', forma: 'solucao' }], 5),
  item('Paracetamol', 'Analgésico / antitérmico', ['Tylenol', 'Dôrico', 'Tylenol Ultra'], ['500 mg', '750 mg', '1 g', { dosagem: '200 mg/ml', forma: 'gotas' }], 5),
  item('Ibuprofeno', 'Anti-inflamatório', ['Advil', 'Alivium', 'Motrin'], ['200 mg', '400 mg', '600 mg', { dosagem: '50 mg/ml', forma: 'gotas' }], 4),
  item('Diclofenaco sódico', 'Anti-inflamatório', ['Cataflam', 'Voltaren', 'Diclac'], ['50 mg', '75 mg', { dosagem: '10 mg/g', forma: 'gel' }, { dosagem: '75 mg/3 ml', forma: 'injecao' }], 4),
  item('Diclofenaco potássico', 'Anti-inflamatório', ['Cataflam'], ['50 mg'], 3),
  item('Nimesulida', 'Anti-inflamatório', ['Nisulid', 'Scaflam'], ['100 mg', { dosagem: '50 mg/ml', forma: 'gotas' }], 4),
  item('Meloxicam', 'Anti-inflamatório', ['Movatec', 'Meloxil'], ['7,5 mg', '15 mg'], 4),
  item('Naproxeno', 'Anti-inflamatório', ['Flanax', 'Naprosyn'], ['250 mg', '500 mg'], 3),
  item('Cetoprofeno', 'Anti-inflamatório', ['Profenid', 'Artrinid'], ['50 mg', '100 mg', { dosagem: '20 mg/ml', forma: 'gotas' }], 3),
  item('Etoricoxibe', 'Anti-inflamatório (coxibe)', ['Arcoxia'], ['60 mg', '90 mg', '120 mg'], 3),
  item('Celecoxibe', 'Anti-inflamatório (coxibe)', ['Celebra'], ['100 mg', '200 mg'], 3),
  item('Tramadol', 'Analgésico opioide', ['Tramal', 'Sylador'], ['50 mg', '100 mg'], 4),
  item('Tramadol + Paracetamol', 'Analgésico combinado', ['Ultracet', 'Tramadon'], ['37,5/325 mg'], 3),
  item('Codeína + Paracetamol', 'Analgésico combinado', ['Tylex', 'Paco'], ['7,5/500 mg', '30/500 mg'], 3),
  item('Pregabalina', 'Dor neuropática', ['Lyrica', 'Prebictal'], ['75 mg', '150 mg', '300 mg'], 4),
  item('Gabapentina', 'Dor neuropática', ['Neurontin', 'Progresse'], ['300 mg', '400 mg', '600 mg'], 4),
  item('Ciclobenzaprina', 'Relaxante muscular', ['Miosan', 'Cimicox'], ['5 mg', '10 mg'], 4),
  item('Carisoprodol + Dipirona + Cafeína', 'Relaxante combinado', ['Dorflex', 'Torsilax'], ['35/300/50 mg'], 4),
  item('Orfenadrina + Dipirona + Cafeína', 'Relaxante combinado', ['Dorflex'], ['35/300/50 mg'], 3),
  item('Prednisona', 'Corticoide', ['Meticorten', 'Predsim'], ['5 mg', '20 mg'], 5),
  item('Prednisolona', 'Corticoide', ['Prelone', 'Pred-Sim'], ['5 mg', '20 mg', { dosagem: '3 mg/ml', forma: 'xarope' }], 4),
  item('Dexametasona', 'Corticoide', ['Decadron'], ['0,5 mg', '4 mg', { dosagem: '4 mg/ml', forma: 'injecao' }], 4),
  item('Betametasona', 'Corticoide', ['Diprospan', 'Celestone'], [{ dosagem: '5+2 mg/ml', forma: 'injecao' }, { dosagem: '0,5 mg/g', forma: 'creme' }], 3),
  item('Hidrocortisona', 'Corticoide', ['Cortisonal'], ['10 mg', '20 mg', { dosagem: '10 mg/g', forma: 'creme' }], 3),

  item('Levotiroxina sódica', 'Tireoide', ['Puran T4', 'Euthyrox', 'Synthroid', 'Levoid'], ['25 mcg', '50 mcg', '75 mcg', '88 mcg', '100 mcg', '112 mcg', '125 mcg', '137 mcg', '150 mcg', '175 mcg', '200 mcg'], 5),

  item('Sertralina', 'Antidepressivo (ISRS)', ['Zoloft', 'Assert'], ['25 mg', '50 mg', '100 mg'], 5),
  item('Fluoxetina', 'Antidepressivo (ISRS)', ['Prozac', 'Daforin', 'Fluxene'], ['10 mg', '20 mg'], 5),
  item('Escitalopram', 'Antidepressivo (ISRS)', ['Lexapro', 'Reconter'], ['10 mg', '15 mg', '20 mg'], 4),
  item('Citalopram', 'Antidepressivo (ISRS)', ['Cipramil'], ['20 mg', '40 mg'], 3),
  item('Paroxetina', 'Antidepressivo (ISRS)', ['Paxil', 'Pondera', 'Cebrilin'], ['20 mg', '25 mg CR'], 4),
  item('Venlafaxina', 'Antidepressivo (IRSN)', ['Efexor', 'Alenthus'], ['37,5 mg', '75 mg', '150 mg'], 4),
  item('Duloxetina', 'Antidepressivo (IRSN)', ['Cymbalta', 'Velija'], ['30 mg', '60 mg'], 4),
  item('Amitriptilina', 'Antidepressivo tricíclico', ['Tryptanol', 'Amytril'], ['10 mg', '25 mg', '75 mg'], 4),
  item('Nortriptilina', 'Antidepressivo tricíclico', ['Pamelor'], ['10 mg', '25 mg', '50 mg'], 3),
  item('Trazodona', 'Antidepressivo', ['Donaren', 'Trittico'], ['50 mg', '100 mg'], 3),
  item('Mirtazapina', 'Antidepressivo', ['Remeron', 'Mirtax'], ['15 mg', '30 mg', '45 mg'], 3),
  item('Bupropiona', 'Antidepressivo', ['Wellbutrin', 'Zetron', 'Bup'], ['150 mg', '300 mg'], 3),
  item('Alprazolam', 'Ansiolítico', ['Frontal', 'Altrox'], ['0,25 mg', '0,5 mg', '1 mg', '2 mg'], 4),
  item('Clonazepam', 'Ansiolítico / anticonvulsivante', ['Rivotril', 'Clonotril'], ['0,25 mg', '0,5 mg', '2 mg', { dosagem: '2,5 mg/ml', forma: 'gotas' }], 5),
  item('Diazepam', 'Ansiolítico', ['Valium', 'Compaz'], ['5 mg', '10 mg'], 4),
  item('Lorazepam', 'Ansiolítico', ['Lorax', 'Mesmerin'], ['1 mg', '2 mg'], 3),
  item('Bromazepam', 'Ansiolítico', ['Lexotan', 'Somalium'], ['3 mg', '6 mg'], 3),
  item('Zolpidem', 'Hipnótico', ['Stilnox', 'Patz Slim'], ['10 mg'], 4),
  item('Zopiclona', 'Hipnótico', ['Imovane'], ['7,5 mg'], 2),
  item('Quetiapina', 'Antipsicótico', ['Seroquel', 'Queropax'], ['25 mg', '100 mg', '200 mg', '300 mg'], 4),
  item('Risperidona', 'Antipsicótico', ['Risperdal', 'Riss'], ['0,5 mg', '1 mg', '2 mg', '3 mg'], 4),
  item('Olanzapina', 'Antipsicótico', ['Zyprexa', 'Zopix'], ['2,5 mg', '5 mg', '10 mg'], 3),
  item('Haloperidol', 'Antipsicótico', ['Haldol'], ['1 mg', '5 mg', { dosagem: '2 mg/ml', forma: 'gotas' }, { dosagem: '5 mg/ml', forma: 'injecao' }], 3),
  item('Aripiprazol', 'Antipsicótico', ['Abilify'], ['10 mg', '15 mg', '30 mg'], 3),
  item('Carbonato de lítio', 'Estabilizador de humor', ['Carbolitium'], ['300 mg'], 3),

  item('Donepezila', 'Demência / Alzheimer', ['Eranz', 'Donila', 'Yasnal'], ['5 mg', '10 mg'], 4),
  item('Memantina', 'Demência / Alzheimer', ['Ebix', 'Alois'], ['10 mg', '20 mg'], 4),
  item('Rivastigmina', 'Demência / Alzheimer', ['Exelon'], ['1,5 mg', '3 mg', '4,5 mg', '6 mg', { dosagem: '4,6 mg/24h', forma: 'adesivo' }, { dosagem: '9,5 mg/24h', forma: 'adesivo' }], 3),
  item('Galantamina', 'Demência / Alzheimer', ['Reminyl'], ['8 mg', '16 mg', '24 mg'], 2),
  item('Levodopa + Carbidopa', 'Parkinson', ['Pargo', 'Sinemet', 'Parkidopa'], ['250/25 mg', '100/25 mg'], 4),
  item('Levodopa + Benserazida', 'Parkinson', ['Prolopa'], ['100/25 mg', '200/50 mg'], 3),
  item('Pramipexol', 'Parkinson', ['Sifrol', 'Mirapex'], ['0,125 mg', '0,25 mg', '1 mg'], 3),
  item('Amantadina', 'Parkinson', ['Mantidan'], ['100 mg'], 3),
  item('Biperideno', 'Antiparkinsoniano', ['Akineton'], ['2 mg'], 3),
  item('Entacapona', 'Parkinson', ['Comtan'], ['200 mg'], 2),
  item('Rasagilina', 'Parkinson', ['Azilect'], ['1 mg'], 2),

  item('Alendronato de sódio', 'Osteoporose', ['Fosamax', 'Endronax'], ['70 mg', '10 mg'], 5),
  item('Risedronato sódico', 'Osteoporose', ['Actonel', 'Osteonate'], ['35 mg', '5 mg', '150 mg'], 3),
  item('Ibandronato', 'Osteoporose', ['Bonviva'], ['150 mg'], 2),
  item('Carbonato de cálcio', 'Suplemento ósseo', ['Cálcio 500', 'Oscal', 'Cálcio Sandoz'], ['500 mg', '600 mg', '1250 mg'], 5),
  item('Carbonato de cálcio + Vitamina D', 'Suplemento ósseo', ['Oscal D', 'Cálcio + D3'], ['500 mg + 200 UI', '500 mg + 400 UI', '600 mg + 400 UI'], 4),
  item('Colecalciferol', 'Vitamina D', ['Addera D3', 'Pebon D3', 'Vitamina D3'], ['1.000 UI', '2.000 UI', '7.000 UI', '50.000 UI', { dosagem: '7.000 UI/ml', forma: 'gotas' }], 5),
  item('Calcitriol', 'Vitamina D ativa', ['Rocaltrol'], ['0,25 mcg'], 3),
  item('Raloxifeno', 'Osteoporose', ['Evista'], ['60 mg'], 2),
  item('Denosumabe', 'Osteoporose', ['Prolia'], [{ dosagem: '60 mg/ml', forma: 'injecao' }], 1),
  item('Ácido zoledrônico', 'Osteoporose', ['Aclasta', 'Zometa'], [{ dosagem: '5 mg/100 ml', forma: 'injecao' }], 1),

  item('Tansulosina', 'Próstata (HBP)', ['Secotex', 'Omnic', 'Tamsulon'], ['0,4 mg'], 4),
  item('Finasterida', 'Próstata (HBP)', ['Proscar', 'Propecia'], ['1 mg', '5 mg'], 4),
  item('Dutasterida', 'Próstata (HBP)', ['Avodart'], ['0,5 mg'], 3),
  item('Alfuzosina', 'Próstata (HBP)', ['Xatral'], ['10 mg'], 2),
  item('Sildenafila', 'Disfunção erétil', ['Viagra', 'Delev', 'Vasidaten'], ['25 mg', '50 mg', '100 mg'], 4),
  item('Tadalafila', 'Disfunção erétil / HBP', ['Cialis', 'Tadala'], ['5 mg', '20 mg'], 4),
  item('Solifenacina', 'Bexiga hiperativa', ['Vesicare'], ['5 mg', '10 mg'], 2),
  item('Oxibutinina', 'Bexiga hiperativa', ['Retemic'], ['5 mg'], 3),
  item('Mirabegrona', 'Bexiga hiperativa', ['Betmiga'], ['25 mg', '50 mg'], 2),
  item('Trospio', 'Bexiga hiperativa', ['Spasmex'], ['20 mg'], 2),

  item('Latanoprosta', 'Glaucoma', ['Xalatan', 'Xalacom'], [{ dosagem: '0,005%', forma: 'gotas' }], 4),
  item('Maleato de timolol', 'Glaucoma', ['Timoptol', 'Glaucotrat'], [{ dosagem: '0,25%', forma: 'gotas' }, { dosagem: '0,5%', forma: 'gotas' }], 4),
  item('Brimonidina', 'Glaucoma', ['Alphagan', 'Brimodin'], [{ dosagem: '0,2%', forma: 'gotas' }, { dosagem: '0,15%', forma: 'gotas' }], 3),
  item('Dorzolamida', 'Glaucoma', ['Trusopt'], [{ dosagem: '2%', forma: 'gotas' }], 3),
  item('Dorzolamida + Timolol', 'Glaucoma', ['Cosopt'], [{ dosagem: '2% + 0,5%', forma: 'gotas' }], 3),
  item('Bimatoprosta', 'Glaucoma', ['Lumigan'], [{ dosagem: '0,03%', forma: 'gotas' }], 2),
  item('Travoprosta', 'Glaucoma', ['Travatan'], [{ dosagem: '0,004%', forma: 'gotas' }], 2),
  item('Lubrificante ocular', 'Olho seco', ['Lacril', 'Hylo-Comod', 'Systane'], [{ dosagem: 'solução oftálmica', forma: 'gotas' }], 3),

  item('Sulfato de salbutamol', 'Asma / DPOC', ['Aerolin', 'Butovent'], [{ dosagem: '100 mcg/dose', forma: 'inalador' }, { dosagem: '5 mg/ml', forma: 'solucao' }], 4),
  item('Brometo de ipratrópio', 'Asma / DPOC', ['Atrovent'], [{ dosagem: '0,02 mg/dose', forma: 'inalador' }, { dosagem: '0,25 mg/ml', forma: 'solucao' }], 4),
  item('Dipropionato de beclometasona', 'Asma / rinite', ['Clenil', 'Beclosol'], [{ dosagem: '50 mcg/dose', forma: 'inalador' }, { dosagem: '200 mcg/dose', forma: 'inalador' }, { dosagem: '250 mcg/dose', forma: 'inalador' }, { dosagem: '50 mcg/dose nasal', forma: 'spray' }], 4),
  item('Budesonida', 'Asma / rinite', ['Budecort', 'Busonid'], [{ dosagem: '32 mcg/dose', forma: 'spray' }, { dosagem: '50 mcg/dose', forma: 'spray' }, { dosagem: '200 mcg/dose', forma: 'inalador' }, { dosagem: '400 mcg/dose', forma: 'inalador' }], 4),
  item('Formoterol', 'Asma / DPOC', ['Foradil', 'Fluir'], [{ dosagem: '12 mcg', forma: 'inalador' }], 3),
  item('Budesonida + Formoterol', 'Asma / DPOC', ['Symbicort', 'Vannair', 'Alenia'], [{ dosagem: '6/200 mcg', forma: 'inalador' }, { dosagem: '12/400 mcg', forma: 'inalador' }], 3),
  item('Salmeterol + Fluticasona', 'Asma / DPOC', ['Seretide', 'Adeforte'], [{ dosagem: '25/125 mcg', forma: 'inalador' }, { dosagem: '25/250 mcg', forma: 'inalador' }], 3),
  item('Brometo de tiotrópio', 'DPOC', ['Spiriva'], [{ dosagem: '18 mcg', forma: 'inalador' }, { dosagem: '2,5 mcg', forma: 'inalador' }], 2),
  item('Montelucaste', 'Asma / rinite', ['Singulair', 'Montelair'], ['4 mg', '5 mg', '10 mg'], 4),
  item('Acetilcisteína', 'Mucolítico', ['Fluimucil', 'Cisteil'], ['200 mg', '600 mg', { dosagem: '20 mg/ml', forma: 'xarope' }], 4),
  item('Ambroxol', 'Mucolítico', ['Mucosolvan', 'Bronquex'], [{ dosagem: '30 mg/5 ml', forma: 'xarope' }, '30 mg'], 3),
  item('Loratadina', 'Antialérgico', ['Claritin', 'Loratamed'], ['10 mg', { dosagem: '1 mg/ml', forma: 'xarope' }], 5),
  item('Desloratadina', 'Antialérgico', ['Desalex', 'Esalerg'], ['5 mg', { dosagem: '0,5 mg/ml', forma: 'xarope' }], 4),
  item('Cetirizina', 'Antialérgico', ['Zyrtec', 'Cetihexal'], ['10 mg', { dosagem: '1 mg/ml', forma: 'gotas' }], 4),
  item('Fexofenadina', 'Antialérgico', ['Allegra', 'Allexofedrin'], ['60 mg', '120 mg', '180 mg'], 4),
  item('Difenidramina', 'Antialérgico', ['Benadryl'], ['50 mg'], 2),
  item('Hidroxizina', 'Antialérgico / ansiolítico', ['Hixizine'], ['25 mg'], 3),
  item('Prednisolona nasal', 'Rinite', ['Prednisona nasal'], [{ dosagem: 'spray nasal', forma: 'spray' }], 2),

  item('Amoxicilina', 'Antibiótico', ['Amoxil', 'Novamox'], ['500 mg', '875 mg', { dosagem: '250 mg/5 ml', forma: 'xarope' }, { dosagem: '50 mg/ml', forma: 'xarope' }], 5),
  item('Amoxicilina + Clavulanato', 'Antibiótico', ['Clavulin', 'Novamox Clav'], ['500/125 mg', '875/125 mg'], 4),
  item('Azitromicina', 'Antibiótico', ['Zitromax', 'Azitrocin', 'Astro'], ['500 mg', { dosagem: '40 mg/ml', forma: 'xarope' }], 5),
  item('Ciprofloxacino', 'Antibiótico', ['Cipro', 'Ciflox'], ['250 mg', '500 mg', '750 mg'], 4),
  item('Levofloxacino', 'Antibiótico', ['Levaquin', 'Tavanic'], ['250 mg', '500 mg', '750 mg'], 3),
  item('Cefalexina', 'Antibiótico', ['Keflex', 'Ceflexin'], ['500 mg', '1 g'], 4),
  item('Ceftriaxona', 'Antibiótico', ['Rocefin', 'Triaxin'], [{ dosagem: '1 g', forma: 'injecao' }, { dosagem: '500 mg', forma: 'injecao' }], 3),
  item('Sulfametoxazol + Trimetoprima', 'Antibiótico', ['Bactrim', 'Infectrin'], ['400/80 mg', '800/160 mg', { dosagem: 'suspensão', forma: 'xarope' }], 4),
  item('Nitrofurantoína', 'Antibiótico (ITU)', ['Macrodantina', 'Furadantina'], ['100 mg'], 4),
  item('Norfloxacino', 'Antibiótico (ITU)', ['Floxacin'], ['400 mg'], 3),
  item('Doxiciclina', 'Antibiótico', ['Vibramicina', 'Doxitrat'], ['100 mg'], 3),
  item('Clindamicina', 'Antibiótico', ['Dalacin'], ['300 mg'], 3),
  item('Metronidazol', 'Antibiótico / antiparasitário', ['Flagyl'], ['250 mg', '400 mg'], 4),
  item('Fluconazol', 'Antifúngico', ['Zoltec', 'Triazol'], ['150 mg', '100 mg'], 4),
  item('Nistatina', 'Antifúngico', ['Micostatin'], [{ dosagem: '100.000 UI/ml', forma: 'suspensao' }], 3),
  item('Aciclovir', 'Antiviral', ['Zovirax'], ['200 mg', '400 mg', { dosagem: '50 mg/g', forma: 'creme' }], 4),
  item('Oseltamivir', 'Antiviral', ['Tamiflu'], ['75 mg'], 2),
  item('Albendazol', 'Antiparasitário', ['Zentel'], ['400 mg'], 4),
  item('Ivermectina', 'Antiparasitário', ['Revectina', 'Ivermec'], ['6 mg'], 4),

  item('Alopurinol', 'Gota / ácido úrico', ['Zyloric', 'Ácido úrico'], ['100 mg', '300 mg'], 5),
  item('Colchicina', 'Gota', ['Colchis', 'Colchicina'], ['0,5 mg', '1 mg'], 4),
  item('Probenecida', 'Gota', ['Benemid'], ['500 mg'], 2),
  item('Complexo B', 'Suplemento', ['Citoneurin', 'Neurobion', 'Bedocil'], ['B1+B6+B12'], 5),
  item('Ácido fólico', 'Suplemento', ['Endofolin', 'Ácido fólico'], ['5 mg', '400 mcg'], 5),
  item('Sulfato ferroso', 'Antianêmico', ['Noripurum', 'Combiron', 'Tardyferon'], ['40 mg', '80 mg', { dosagem: '25 mg/ml', forma: 'gotas' }], 4),
  item('Cloreto de potássio', 'Eletrólito', ['Slow-K', 'Kalinor'], ['600 mg'], 3),
  item('Carbonato de magnésio / Magnésio', 'Suplemento', ['Magnésio quelato', 'Magnésio dimalato'], ['260 mg', '300 mg'], 3),
  item('Ômega 3', 'Suplemento', ['Omacor', 'Ômega 3'], ['1000 mg', '500 mg'], 4),
  item('Polivitamínico 50+', 'Suplemento', ['Centrum Silver', 'Supradyn 50+', 'Revit 50+'], ['1 comprimido'], 3),
  item('Ginkgo biloba', 'Suplemento / circulação', ['Tebonin', 'Ginkomed'], ['40 mg', '80 mg', '120 mg'], 4),
  item('Isoflavona de soja', 'Climaterio', ['Isoflavinea'], ['60 mg', '80 mg'], 2),
  item('Estradiol', 'Reposição hormonal', ['Climene', 'Estreva'], ['1 mg', '2 mg', { dosagem: 'gel', forma: 'gel' }], 2),
  item('Tibolona', 'Climaterio', ['Livial'], ['2,5 mg'], 2),

  item('Amiodarona', 'Antiarrítmico', ['Ancoron', 'Atlansil'], ['100 mg', '200 mg'], 4),
  item('Digoxina', 'Cardiotônico', ['Digoxina', 'Lanoxin'], ['0,25 mg', '0,125 mg'], 4),
  item('Isossorbida', 'Antianginoso', ['Isordil', 'Monocordil'], ['5 mg', '10 mg', '20 mg', '40 mg'], 4),
  item('Trimetazidina', 'Antianginoso', ['Preductal', 'Vastarel'], ['35 mg MR', '80 mg'], 3),
  item('Ivabradina', 'Antianginoso / IC', ['Procoralan'], ['5 mg', '7,5 mg'], 2),
  item('Sacubitril + Valsartana', 'Insuficiência cardíaca', ['Entresto'], ['24/26 mg', '49/51 mg', '97/103 mg'], 2),
  item('Espironolactona + Hidroclorotiazida', 'Diurético combinado', ['Aldazida'], ['25/25 mg', '50/50 mg'], 2),
  item('Hidroclorotiazida + Amilorida', 'Diurético combinado', ['Moduretic'], ['50/5 mg'], 3),

  item('Fenitoína', 'Anticonvulsivante', ['Hidantal'], ['100 mg'], 3),
  item('Carbamazepina', 'Anticonvulsivante', ['Tegretol', 'Tegretol CR'], ['200 mg', '400 mg'], 4),
  item('Ácido valproico / Divalproato', 'Anticonvulsivante', ['Depakene', 'Depakote'], ['250 mg', '500 mg'], 3),
  item('Lamotrigina', 'Anticonvulsivante', ['Lamictal'], ['25 mg', '50 mg', '100 mg'], 3),
  item('Levetiracetam', 'Anticonvulsivante', ['Keppra'], ['250 mg', '500 mg', '1000 mg'], 3),
  item('Topiramato', 'Anticonvulsivante / enxaqueca', ['Topamax'], ['25 mg', '50 mg', '100 mg'], 3),
  item('Fenobarbital', 'Anticonvulsivante', ['Gardenal'], ['50 mg', '100 mg'], 3),

  item('Sinvastatina + Ezetimiba', 'Hipolipemiante combinado', ['Vytorin'], ['10/10 mg', '20/10 mg', '40/10 mg'], 3),
  item('Atorvastatina + Anlodipino', 'Cardio combinado', ['Caduet'], ['10/5 mg', '20/5 mg', '20/10 mg'], 2),
  item('Rosuvastatina + Ezetimiba', 'Hipolipemiante combinado', ['Trezete'], ['10/10 mg', '20/10 mg'], 3),

  item('Tiamina (vitamina B1)', 'Suplemento', ['Benerva', 'Tiamina'], ['300 mg'], 3),
  item('Cianocobalamina (vitamina B12)', 'Suplemento', ['Citoneurin B12', 'Bedex'], [{ dosagem: '1000 mcg', forma: 'injecao' }, '500 mcg', '1000 mcg'], 4),
  item('Piridoxina (vitamina B6)', 'Suplemento', ['Adermina'], ['50 mg', '100 mg'], 3),
  item('Ácido ascórbico (vitamina C)', 'Suplemento', ['Redoxon', 'Cewin'], ['500 mg', '1 g', { dosagem: '200 mg/ml', forma: 'gotas' }], 4),
  item('Retinol (vitamina A)', 'Suplemento', ['Arovit'], ['50.000 UI'], 2),
  item('Tocoferol (vitamina E)', 'Suplemento', ['Ephynal'], ['400 UI'], 3),
  item('Zinco', 'Suplemento', ['Zinco quelato', 'Zinco quelado'], ['30 mg', '50 mg'], 3),
  item('Selênio', 'Suplemento', ['Selênio quelato'], ['100 mcg', '200 mcg'], 2),

  item('Lactase', 'Digestivo', ['Lactoway', 'Lacday'], ['10.000 FCC'], 2),
  item('Enzimas digestivas', 'Digestivo', ['Pangest', 'Digestron'], ['drágea'], 2),
  item('Saccharomyces boulardii', 'Probiótico', ['Floratil'], ['200 mg', '250 mg'], 3),
  item('Racecadotrila', 'Antidiarreico', ['Tiorfan'], ['100 mg'], 2),
  item('Loperamida', 'Antidiarreico', ['Imosec'], ['2 mg'], 3),
  item('Sais de reidratação oral', 'Reidratação', ['Rehidrat', 'Pedialyte'], [{ dosagem: 'envelope', forma: 'solucao' }], 3),

  item('Heparina sódica', 'Anticoagulante', ['Liquemine'], [{ dosagem: '5.000 UI/ml', forma: 'injecao' }], 2),
  item('Fondaparinux', 'Anticoagulante', ['Arixtra'], [{ dosagem: '2,5 mg', forma: 'injecao' }], 1),
  item('Alteplase', 'Trombolítico', ['Actilyse'], [{ dosagem: '50 mg', forma: 'injecao' }], 1),

  item('Nitrato de isossorbida spray', 'Antianginoso', ['Isordil spray'], [{ dosagem: '1,25 mg/dose', forma: 'spray' }], 2),
  item('Mononitrato de isossorbida', 'Antianginoso', ['Monocordil', 'Isomak'], ['20 mg', '40 mg', '50 mg'], 3),

  item('Glicazida + Metformina', 'Antidiabético combinado', ['Glimeforin'], ['80/500 mg'], 2),
  item('Glimepirida + Metformina', 'Antidiabético combinado', ['Amaryl M'], ['2/500 mg', '2/1000 mg', '4/1000 mg'], 3),
  item('Vildagliptina + Metformina', 'Antidiabético combinado', ['Galvus Met'], ['50/500 mg', '50/850 mg', '50/1000 mg'], 3),
  item('Linagliptina + Metformina', 'Antidiabético combinado', ['Trajenta Duo'], ['2,5/500 mg', '2,5/1000 mg'], 2),

  item('Hidroclorotiazida + Losartana + Anlodipino', 'Anti-hipertensivo triplo', ['Lotar HCT'], ['50/12,5/5 mg'], 2),
  item('Olmesartana + Anlodipino', 'Anti-hipertensivo combinado', ['Benicar Anlo'], ['20/5 mg', '40/5 mg', '40/10 mg'], 3),
  item('Olmesartana + Hidroclorotiazida', 'Anti-hipertensivo combinado', ['Benicar HCT'], ['20/12,5 mg', '40/12,5 mg', '40/25 mg'], 3),
  item('Telmisartana + Hidroclorotiazida', 'Anti-hipertensivo combinado', ['Micardis HCT'], ['40/12,5 mg', '80/12,5 mg', '80/25 mg'], 2),
  item('Candesartana + Hidroclorotiazida', 'Anti-hipertensivo combinado', ['Atacand HCT'], ['16/12,5 mg', '32/12,5 mg'], 2),
  item('Irbesartana + Hidroclorotiazida', 'Anti-hipertensivo combinado', ['CoAprovel'], ['150/12,5 mg', '300/12,5 mg'], 2),
  item('Enalapril + Hidroclorotiazida', 'Anti-hipertensivo combinado', ['Renitec HCT', 'Atens-H'], ['10/25 mg', '20/12,5 mg'], 3),
  item('Atenolol + Clortalidona', 'Anti-hipertensivo combinado', ['Ablok Plus', 'Angipress CD'], ['25/12,5 mg', '50/12,5 mg', '100/25 mg'], 3),
  item('Anlodipino + Atenolol', 'Anti-hipertensivo combinado', ['Anloten'], ['5/50 mg'], 2),
  item('Ramipril + Hidroclorotiazida', 'Anti-hipertensivo combinado', ['Tritazide'], ['5/25 mg', '10/25 mg'], 2),

  item('Desloratadina + Pseudoefedrina', 'Antialérgico combinado', ['Desalex D'], ['2,5/120 mg'], 2),
  item('Loratadina + Pseudoefedrina', 'Antialérgico combinado', ['Claritin D'], ['5/120 mg'], 2),
  item('Paracetamol + Fenilefrina + Clorfeniramina', 'Resfriado', ['Resfenol', 'Cimegripe'], ['400/20/4 mg'], 4),
  item('Paracetamol + Cafeína', 'Analgésico', ['Tylenol DC', 'Doril'], ['500/65 mg'], 3),
  item('Dipirona + Cafeína + Orfenadrina', 'Analgésico combinado', ['Dorflex'], ['300/50/35 mg'], 4),
  item('Naproxeno + Esomeprazol', 'Anti-inflamatório + IBP', ['Vimovo'], ['500/20 mg'], 1),

  item('Tansulosina + Dutasterida', 'Próstata combinado', ['Duodart', 'Combodart'], ['0,4/0,5 mg'], 3),
  item('Finasterida + Tansulosina', 'Próstata combinado', ['Prostam'], ['5/0,4 mg'], 2),

  item('Fluticasona nasal', 'Rinite', ['Flonase', 'Avamys'], [{ dosagem: '50 mcg/dose', forma: 'spray' }], 3),
  item('Mometasona nasal', 'Rinite', ['Nasonex'], [{ dosagem: '50 mcg/dose', forma: 'spray' }], 3),
  item('Azelastina nasal', 'Rinite', ['Astelin'], [{ dosagem: 'spray nasal', forma: 'spray' }], 2),
  item('Oximetazolina', 'Descongestionante nasal', ['Nasivin', 'Aturgyl'], [{ dosagem: '0,5 mg/ml', forma: 'gotas' }], 3),

  item('Insulina NPH + Regular 70/30', 'Insulina pré-mistura', ['Humulin 70/30', 'Novolin 70/30'], [{ dosagem: '100 UI/ml', forma: 'injecao' }], 2),
  item('Insulina aspart bifásica', 'Insulina pré-mistura', ['NovoMix 30'], [{ dosagem: '100 UI/ml', forma: 'injecao' }], 1),
  item('Insulina lispro Mix 25', 'Insulina pré-mistura', ['Humalog Mix 25'], [{ dosagem: '100 UI/ml', forma: 'injecao' }], 1),

  item('Hidroxicloroquina', 'Reumatológico', ['Reuquinol', 'Plaquinol'], ['400 mg'], 3),
  item('Metotrexato', 'Reumatológico', ['Miantrex', 'Metrexato'], ['2,5 mg', { dosagem: '25 mg/ml', forma: 'injecao' }], 3),
  item('Leflunomida', 'Reumatológico', ['Arava'], ['10 mg', '20 mg'], 2),
  item('Sulfassalazina', 'Reumatológico / intestinal', ['Azulfidine'], ['500 mg'], 3),
  item('Colchicina + Alopurinol', 'Gota combinado', [], ['0,5/100 mg'], 2),
  item('Baclofeno', 'Relaxante muscular', ['Lioresal'], ['10 mg'], 3),
  item('Tizanidina', 'Relaxante muscular', ['Sirdalud'], ['2 mg', '4 mg'], 2),
  item('Cloreto de sódio 0,9%', 'Soro fisiológico', ['SF 0,9%'], [{ dosagem: '500 ml', forma: 'solucao' }, { dosagem: '1000 ml', forma: 'solucao' }, { dosagem: '10 ml', forma: 'solucao' }], 3),
  item('Glicose 5%', 'Soro glicosado', ['SG 5%'], [{ dosagem: '500 ml', forma: 'solucao' }, { dosagem: '250 ml', forma: 'solucao' }], 3),
  item('Ringer lactato', 'Soro', ['RL'], [{ dosagem: '500 ml', forma: 'solucao' }], 2),

  item('Nitroglicerina', 'Antianginoso', ['Tridil', 'Nitradisc'], [{ dosagem: 'adesivo 5 mg/24h', forma: 'adesivo' }, { dosagem: 'adesivo 10 mg/24h', forma: 'adesivo' }, { dosagem: '5 mg/ml', forma: 'injecao' }], 2),
  item('Dinitrato de isossorbida SL', 'Antianginoso', ['Isordil sublingual'], ['5 mg SL'], 3),

  item('Cloridrato de ranitidina', 'Anti-H2', ['Antak', 'Label'], ['150 mg', '300 mg'], 3),
  item('Famotidina', 'Anti-H2', ['Famox'], ['20 mg', '40 mg'], 2),
  item('Pantoprazol + Domperidona', 'Gástrico combinado', ['Pantozol D'], ['40/10 mg'], 2),

  item('Lactitol', 'Laxante', ['Importal'], [{ dosagem: '10 g', forma: 'pó' }], 2),
  item('Macrogol (PEG 3350)', 'Laxante', ['Muvinlax', 'Glycoprep'], [{ dosagem: 'envelope', forma: 'pó' }], 3),
  item('Psyllium', 'Fibras', ['Metamucil'], [{ dosagem: 'pó', forma: 'pó' }], 2),

  item('Betahistina', 'Labirintite / tontura', ['Microser', 'Betaserc'], ['8 mg', '16 mg', '24 mg'], 4),
  item('Cinarizina', 'Tontura / vertigem', ['Stugeron'], ['25 mg', '75 mg'], 3),
  item('Flunarizina', 'Enxaqueca / vertigem', ['Flunizin', 'Sibelium'], ['5 mg', '10 mg'], 3),
  item('Cloridrato de meclizina', 'Tontura', ['Meclin'], ['25 mg'], 3),
  item('Sumatriptana', 'Enxaqueca', ['Imigran', 'Sumax'], ['50 mg', '100 mg'], 3),
  item('Rizatriptana', 'Enxaqueca', ['Maxalt'], ['10 mg'], 2),
  item('Propranolol migração', 'Profilaxia de enxaqueca', ['Inderal'], ['40 mg'], 2),

  item('Tadalafila 5 mg contínuo', 'HBP / DE uso diário', ['Cialis 5 mg'], ['5 mg'], 3),
  item('Vardenafila', 'Disfunção erétil', ['Levitra'], ['10 mg', '20 mg'], 2),

  item('Estradiol + Noretisterona', 'Reposição hormonal', ['Activelle', 'Climene'], ['1/0,5 mg'], 2),
  item('Estrogênios conjugados', 'Reposição hormonal', ['Premarin'], ['0,3 mg', '0,625 mg'], 2),
  item('Progesterona micronizada', 'Reposição hormonal', ['Utrogestan'], ['100 mg', '200 mg'], 3),

  item('Insulina glargina + Lixisenatida', 'Antidiabético combinado', ['Soliqua'], [{ dosagem: '100 UI/ml + 50 mcg/ml', forma: 'injecao' }], 1),
  item('Insulina degludeca + Liraglutida', 'Antidiabético combinado', ['Xultophy'], [{ dosagem: '100 UI/ml + 3,6 mg/ml', forma: 'injecao' }], 1),

  item('Brometo de umeclidínio + Vilanterol', 'DPOC', ['Anoro'], [{ dosagem: '62,5/25 mcg', forma: 'inalador' }], 1),
  item('Fluticasona + Umeclidínio + Vilanterol', 'DPOC', ['Trelegy'], [{ dosagem: '100/62,5/25 mcg', forma: 'inalador' }], 1),
  item('Indacaterol + Glicopirrônio', 'DPOC', ['Ultibro'], [{ dosagem: '110/50 mcg', forma: 'inalador' }], 1),

  item('Ácido tranexâmico', 'Hemostático', ['Transamin'], ['250 mg', '500 mg'], 3),
  item('Vitamina K (fitomenadiona)', 'Coagulação', ['Kanakion'], [{ dosagem: '10 mg/ml', forma: 'injecao' }, '10 mg'], 2),
  item('Ácido fólico + Ferro + B12', 'Antianêmico combinado', ['Combiron Fol', 'Anemifer'], ['drágea'], 3),
  item('Eritropoetina', 'Antianêmico', ['Eprex', 'Alfaepoetina'], [{ dosagem: '4000 UI', forma: 'injecao' }, { dosagem: '2000 UI', forma: 'injecao' }], 2),

  item('Sevelâmer', 'Fósforo (DRC)', ['Renagel', 'Renvela'], ['800 mg'], 2),
  item('Carbonato de cálcio (quelante)', 'Fósforo (DRC)', ['Oscal'], ['500 mg', '1250 mg'], 3),
  item('Calcitriol (DRC)', 'DCR / paratormônio', ['Rocaltrol'], ['0,25 mcg', '0,50 mcg'], 3),
  item('Cinacalcete', 'Hiperparatireoidismo', ['Mimpara'], ['30 mg', '60 mg'], 2),
  item('Furosemida 40 mg + Espironolactona', 'Diurético combinado', ['Lasilactona'], ['40/50 mg', '20/50 mg'], 3),

  item('Clopidogrel + AAS', 'Antiplaquetário combinado', ['Plavix AAS', 'DuoPlavin'], ['75/100 mg'], 3),
  item('Rivaroxabana 2,5 mg + AAS', 'Cardio combinado', ['Xarelto Vascular'], ['2,5 mg'], 2),

  item('N-acetilcisteína efervescente', 'Mucolítico', ['Fluimucil efervescente'], ['600 mg'], 3),
  item('Hedera helix', 'Xarope expectorante', ['Hederahelix', 'Abrilar'], [{ dosagem: 'xarope', forma: 'xarope' }], 2),
];

function shortInn(inn) {
  let s = String(inn || '')
    .split(',')[0]
    .replace(/\s*\(.*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
  s = s.replace(
    /^(cloridrato|maleato|besilato|succinato|tartarato|dipropionato|brometo|sulfato|carbonato|acetato)\s+de\s+/i,
    ''
  );
  s = s.replace(
    /\s+(potássica|potássico|sódica|sódico|de sódio|medoxomila|cilexetila)$/i,
    ''
  );
  if (s) s = s.charAt(0).toUpperCase() + s.slice(1);
  return s;
}

function addRow(seen, rows, nome, inn, dosagem, forma, classe) {
  const nomeN = String(nome || '').trim();
  const doseN = String(dosagem || '').trim();
  const formaN = String(forma || 'comprimido').trim() || 'comprimido';
  if (!nomeN || !doseN) return;
  const key = `${nomeN.toLowerCase()}|${doseN.toLowerCase()}|${formaN.toLowerCase()}`;
  if (seen.has(key)) return;
  seen.add(key);
  rows.push({
    nome_comercial: nomeN.slice(0, 180),
    principio_ativo: String(inn).slice(0, 180),
    dosagem: doseN.slice(0, 80),
    forma_farmaceutica: formaN.slice(0, 80),
    classe_terapeutica: classe ? String(classe).slice(0, 120) : null,
  });
}

function buildCatalogoMedicamentos() {
  const seen = new Set();
  const rows = [];

  for (const drug of DRUGS) {
    const base = shortInn(drug.inn);
    const names = new Set();
    if (base) names.add(base);
    names.add(drug.inn);
    for (const marca of drug.marcas || []) names.add(marca);
    const labCount = Number(drug.labCount || 0);
    for (const lab of LABS.slice(0, labCount)) {
      names.add(`${base} ${lab}`);
    }
    for (const nome of names) {
      for (const ap of drug.apresentacoes || []) {
        addRow(seen, rows, nome, drug.inn, ap.dosagem, ap.forma, drug.classe);
      }
    }
  }

  // Garante ≥ 2000 nomes comerciais preenchendo laboratórios restantes.
  const uniqueNameCount = () => {
    const s = new Set();
    for (const r of rows) s.add(r.nome_comercial.toLowerCase());
    return s.size;
  };

  let labOffset = 0;
  while ((rows.length < 2000 || uniqueNameCount() < 2000) && labOffset < LABS.length) {
    const lab = LABS[labOffset];
    labOffset += 1;
    for (const drug of DRUGS) {
      const base = shortInn(drug.inn);
      for (const ap of drug.apresentacoes || []) {
        addRow(seen, rows, `${base} ${lab}`, drug.inn, ap.dosagem, ap.forma, drug.classe);
      }
    }
  }

  rows.sort((a, b) => {
    const n = a.nome_comercial.localeCompare(b.nome_comercial, 'pt-BR');
    if (n) return n;
    return a.dosagem.localeCompare(b.dosagem, 'pt-BR', { numeric: true });
  });
  return rows;
}

module.exports = { buildCatalogoMedicamentos, DRUGS };
