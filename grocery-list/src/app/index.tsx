import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Platform,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {
  collection,
  addDoc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signInAnonymously,
} from 'firebase/auth';
import { db } from '../../firebaseConfig';

const auth = getAuth();
const provider = new GoogleAuthProvider();

const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY ?? '';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

type GroceryItem = {
  id: string;
  name: string;
  checked: boolean;
  addedBy: string;
  category: string;
  quantity: number;
};

type Screen = 'login' | 'register';

const CATEGORY_OPTIONS = [
  'Fruits','Produce','Dairy','Meat','Bakery','Frozen','Drinks','Pantry','Household','Other',
];

const CATEGORY_RULES: { category: string; keywords: string[] }[] = [
  {
    category: 'Fruits',
    keywords: [
      'apple','banana','orange','grape','strawberry','strawberries','blueberry','blueberries',
      'raspberry','raspberries','blackberry','blackberries','kiwi','mango','pineapple','pear',
      'peach','plum','watermelon','cantaloupe','honeydew','cherry','cherries','lemon','lime',
      'grapefruit','pomegranate','apricot','nectarine',
    ],
  },
  {
    category: 'Produce',
    keywords: [
      'tomato','tomatoes','onion','onions','garlic','potato','potatoes','sweet potato',
      'sweet potatoes','carrot','carrots','celery','pepper','bell pepper','bell peppers',
      'cucumber','cucumbers','broccoli','cauliflower','spinach','lettuce','romaine','kale',
      'zucchini','squash','green bean','green beans','herbs','cilantro','parsley',
    ],
  },
  { category: 'Dairy',     keywords: ['milk','cheese','yogurt','butter','cream','egg','eggs','sour cream','cottage cheese'] },
  { category: 'Meat',      keywords: ['chicken','beef','pork','turkey','fish','salmon','shrimp','bacon','ham','steak','sausage'] },
  { category: 'Bakery',    keywords: ['bread','bagel','bun','muffin','croissant','cake','donut','tortilla','roll'] },
  { category: 'Frozen',    keywords: ['frozen','ice cream','pizza','waffle','fries','nugget','ice'] },
  { category: 'Drinks',    keywords: ['water','soda','juice','coffee','tea','milkshake','energy drink','sports drink'] },
  { category: 'Pantry',    keywords: ['rice','pasta','beans','cereal','flour','sugar','salt','oil','sauce','spaghetti','oats'] },
  { category: 'Household', keywords: ['soap','paper towel','tissue','detergent','toilet paper','trash bag','cleaner','sponge'] },
];

const SUGGESTIONS = [
  'Apples','Bananas','Oranges','Grapes','Strawberries','Blueberries','Raspberries','Blackberries',
  'Kiwis','Mangoes','Pineapple','Pears','Peaches','Plums','Cherries','Watermelon','Cantaloupe',
  'Honeydew melon','Grapefruit','Pomegranate','Lemons','Limes','Roma tomatoes','Grape tomatoes',
  'Onions','Red onions','Garlic','Potatoes','Sweet potatoes','Carrots','Celery','Bell peppers',
  'Cucumbers','Broccoli','Cauliflower','Spinach','Mixed salad','Romaine lettuce','Iceberg lettuce',
  'Avocados','Mushrooms','Zucchini','Chicken breast','Chicken thighs','Whole chicken','Ground beef',
  'Beef stew meat','Pork chops','Pork shoulder','Ground turkey','Bacon','Ham','Sausage links',
  'Hot dogs','Tilapia fillets','Salmon fillets','Frozen shrimp','Whole milk','2% milk','Almond milk',
  'Oat milk','Greek yogurt','Plain yogurt','Sliced cheese','Shredded cheese','Block cheddar cheese',
  'Mozzarella cheese','Butter','Whipping cream','Eggs','Cottage cheese','Cream cheese','Sour cream',
  'Potato chips','Tortilla chips','Pretzels','Popcorn','Crackers','Granola bars','Fruit snacks',
  'Chocolate bar','Gummy candy','Trail mix','Frozen pizza','Frozen french fries','Frozen vegetables',
  'Frozen fruit','Frozen waffles','Frozen pancakes','Ice cream','Frozen chicken nuggets',
  'Frozen fish sticks','White bread','Whole wheat bread','Multigrain bread','Burger buns',
  'Hot dog buns','Tortillas','Bagels','English muffins','Dinner rolls','Croissants','Spaghetti',
  'Penne pasta','Rice','Brown rice','Quinoa','Black beans','Kidney beans','Chickpeas','Canned corn',
  'Canned tomatoes','Tomato sauce','Pasta sauce','Canned tuna','Peanut butter','Jelly','Flour',
  'Sugar','Brown sugar','Olive oil','Vegetable oil','Vinegar','Chicken broth','Beef broth',
  'Bottled water','Sparkling water','Orange juice','Apple juice','Lemonade','Soda','Iced tea',
  'Coffee','Ground coffee','Coffee pods','Tea bags','Sports drink','Corn flakes','Oat cereal',
  'Granola cereal','Instant oatmeal','Old fashioned oats','Maple syrup','Pancake mix',
  'Sliced turkey','Sliced ham','Hummus','Premade salad','Paper towels','Toilet paper',
  'Facial tissue','Trash bags','Dish soap','Dishwasher tablets','Laundry detergent',
  'Fabric softener','All-purpose cleaner','Sponges','Aluminum foil','Plastic wrap',
  'Sandwich bags','Freezer bags','Shampoo','Conditioner','Body wash','Toothpaste','Deodorant',
  'Diapers','Baby wipes','Baby formula','Dry dog food','Dry cat food','Cat litter',
];

// ── Fallback: rule-based category detection ──────────────────────────────────
function detectCategoryFallback(name: string): string {
  const value = name.toLowerCase().trim();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some(k => value.includes(k))) return rule.category;
  }
  return 'Other';
}

// ── Groq helper ───────────────────────────────────────────────────────────────
async function groqChat(systemPrompt: string, userMessage: string): Promise<string> {
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      max_tokens: 200,
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage  },
      ],
    }),
  });
  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}

// ── AI: detect category (falls back to rules if AI fails) ────────────────────
async function aiDetectCategory(name: string): Promise<string> {
  try {
    const system = `You are a grocery categorization assistant. Given a grocery item name, respond with ONLY one of these exact category names and nothing else: Fruits, Produce, Dairy, Meat, Bakery, Frozen, Drinks, Pantry, Household, Other.`;
    const result = await groqChat(system, name);
    if (CATEGORY_OPTIONS.includes(result)) return result;
    return detectCategoryFallback(name);
  } catch {
    return detectCategoryFallback(name);
  }
}

// ── AI: get suggestions while typing (falls back to static list) ─────────────
async function aiGetSuggestions(partial: string): Promise<string[]> {
  try {
    const system = `You are a grocery list assistant. Given a partial grocery item the user is typing, return exactly 6 relevant grocery item suggestions as a JSON array of strings. Only return the JSON array, nothing else, no markdown, no explanation. Example output: ["Apples","Apple juice","Apple cider","Applesauce","Apple cider vinegar","Green apples"]`;
    const result = await groqChat(system, partial);
    const cleaned = result.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed.slice(0, 8);
    return [];
  } catch {
    // fallback to static list
    const value = partial.toLowerCase();
    return SUGGESTIONS.filter(s => s.toLowerCase().includes(value)).slice(0, 8);
  }
}

export default function App() {
  const [items, setItems]               = useState<GroceryItem[]>([]);
  const [text, setText]                 = useState('');
  const [user, setUser]                 = useState<User | null>(null);
  const [screen, setScreen]             = useState<Screen>('login');
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [username, setUsername]         = useState('');
  const [guestName, setGuestName]       = useState('');
  const [showGuestInput, setShowGuestInput] = useState(false);
  const [error, setError]               = useState('');
  const [manualCategory, setManualCategory] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions]   = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [addingItem, setAddingItem]     = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setUser(u));
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, 'groceries'), snapshot => {
      setItems(
        snapshot.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({
          id:       d.id,
          name:     String(d.data().name     ?? ''),
          checked:  Boolean(d.data().checked),
          addedBy:  String(d.data().addedBy  ?? ''),
          category: String(d.data().category ?? 'Other'),
          quantity: Number(d.data().quantity  ?? 1),
        }))
      );
    });
    return unsub;
  }, [user]);

  // AI suggestions with 400 ms debounce as user types
  useEffect(() => {
    const value = text.trim();
    if (!value) { setAiSuggestions([]); return; }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoadingSuggestions(true);
      const suggestions = await aiGetSuggestions(value);
      setAiSuggestions(suggestions);
      setLoadingSuggestions(false);
    }, 400);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [text]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, GroceryItem[]> = {};
    for (const item of items) {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [items]);

  const signInGoogle = async () => {
    try {
      setError('');
      if (Platform.OS !== 'web') {
        Alert.alert('Google sign-in', 'Google popup login is enabled for web. Use the web app or a native auth flow.');
        return;
      }
      await signInWithPopup(auth, provider);
    } catch (e: any) { setError(e.message); }
  };

  const signInEmail = async () => {
    try {
      setError('');
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch { setError('Invalid email or password'); }
  };

  const registerUser = async () => {
    try {
      setError('');
      if (!username.trim()) { setError('Please enter a username'); return; }
      const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(result.user, { displayName: username.trim() });
    } catch (e: any) {
      if      (e.code === 'auth/email-already-in-use') setError('Email already registered');
      else if (e.code === 'auth/weak-password')        setError('Password must be 6+ characters');
      else                                              setError(e.message);
    }
  };

  const signInGuest = async () => {
    try {
      setError('');
      if (!guestName.trim()) { setError('Please enter your name'); return; }
      const result = await signInAnonymously(auth);
      await updateProfile(result.user, { displayName: guestName.trim() });
    } catch (e: any) { setError(e.message); }
  };

  const signOutUser = async () => { await signOut(auth); };

  const addItem = async (nameOverride?: string) => {
    const value = (nameOverride ?? text).trim();
    if (!value || !user || addingItem) return;

    setAddingItem(true);
    try {
      // AI detects category; falls back to rule-based if it fails
      const category = await aiDetectCategory(value);

      await addDoc(collection(db, 'groceries'), {
        name:     value,
        checked:  false,
        addedBy:  user.displayName || user.email || 'Guest',
        category,
        quantity: 1,
      });

      setText('');
      setManualCategory(null);
      setAiSuggestions([]);
    } finally {
      setAddingItem(false);
    }
  };

  const handleSuggestionPress = (suggestion: string) => {
    setText(suggestion);
    addItem(suggestion);
  };

  const toggleItem = async (item: GroceryItem) => {
    await updateDoc(doc(db, 'groceries', item.id), { checked: !item.checked });
  };

  const updateQuantity = async (item: GroceryItem, delta: 1 | -1) => {
    const next = item.quantity + delta;
    if (next < 1) return;
    await updateDoc(doc(db, 'groceries', item.id), { quantity: next });
  };

  const deleteItem = async (id: string) => {
    await deleteDoc(doc(db, 'groceries', id));
  };

  // ── Login / Register screens ─────────────────────────────────────────────
  if (!user) {
    return (
      <SafeAreaView style={styles.loginContainer}>
        <Text style={styles.title}>Grocery List</Text>

        {screen === 'login' ? (
          <View style={styles.form}>
            <Text style={styles.formTitle}>Sign In</Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <TextInput style={styles.formInput} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            <TextInput style={styles.formInput} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
            <TouchableOpacity style={styles.primaryBtn} onPress={signInEmail}>
              <Text style={styles.primaryBtnText}>Sign In</Text>
            </TouchableOpacity>
            <Text style={styles.orText}>— or —</Text>
            <TouchableOpacity style={styles.googleBtn} onPress={signInGoogle}>
              <Text style={styles.googleBtnText}>Sign in with Google</Text>
            </TouchableOpacity>
            <Text style={styles.orText}>— or —</Text>
            {!showGuestInput ? (
              <TouchableOpacity style={styles.guestBtn} onPress={() => setShowGuestInput(true)}>
                <Text style={styles.guestBtnText}>Continue as Guest</Text>
              </TouchableOpacity>
            ) : (
              <View>
                <TextInput style={styles.formInput} placeholder="Enter your name" value={guestName} onChangeText={setGuestName} />
                <TouchableOpacity style={styles.guestBtn} onPress={signInGuest}>
                  <Text style={styles.guestBtnText}>Join as Guest</Text>
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity onPress={() => { setScreen('register'); setError(''); }}>
              <Text style={styles.switchText}>No account? Create one</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.formTitle}>Create Account</Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <TextInput style={styles.formInput} placeholder="Username" value={username} onChangeText={setUsername} />
            <TextInput style={styles.formInput} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            <TextInput style={styles.formInput} placeholder="Password (6+ characters)" value={password} onChangeText={setPassword} secureTextEntry />
            <TouchableOpacity style={styles.primaryBtn} onPress={registerUser}>
              <Text style={styles.primaryBtnText}>Create Account</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setScreen('login'); setError(''); }}>
              <Text style={styles.switchText}>Already have an account? Sign in</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    );
  }

  // ── Main app screen ──────────────────────────────────────────────────────
  const pendingValue    = text.trim();
  const pendingDetected = pendingValue.length > 0 ? detectCategoryFallback(pendingValue) : null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Grocery List</Text>
        <TouchableOpacity onPress={signOutUser}>
          <Text style={styles.signOut}>Sign out</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.welcome}>Hi, {user.displayName || 'Guest'}</Text>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Add an item..."
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => addItem()}
          returnKeyType="done"
          editable={!addingItem}
        />
        <TouchableOpacity
          style={[styles.addBtn, addingItem && styles.addBtnDisabled]}
          onPress={() => addItem()}
          disabled={addingItem}
        >
          {addingItem
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.addBtnText}>Add</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Manual category picker — only shown when AI + rules both return Other */}
      {pendingValue && pendingDetected === 'Other' && !loadingSuggestions && (
        <View style={styles.categoryPickerRow}>
          <Text style={styles.categoryPickerLabel}>Choose category:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryPickerScroll}>
            {CATEGORY_OPTIONS.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, manualCategory === cat && styles.categoryChipActive]}
                onPress={() => setManualCategory(cat)}
              >
                <Text style={[styles.categoryChipText, manualCategory === cat && styles.categoryChipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* AI suggestions */}
      {(aiSuggestions.length > 0 || loadingSuggestions) && (
        <View style={styles.suggestionsContainer}>
          {loadingSuggestions ? (
            <View style={styles.suggestionsLoading}>
              <ActivityIndicator size="small" color="#4CAF50" />
              <Text style={styles.suggestionsLoadingText}>AI thinking…</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionsRow}>
              {aiSuggestions.map(s => (
                <TouchableOpacity key={s} style={styles.suggestionChip} onPress={() => handleSuggestionPress(s)}>
                  <Text style={styles.suggestionText}>✨ {s}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      <FlatList
        data={groupedItems}
        keyExtractor={([category]) => category}
        renderItem={({ item: [category, categoryItems] }) => (
          <View style={styles.categoryBlock}>
            <Text style={styles.categoryTitle}>{category}</Text>
            {categoryItems.map(item => (
              <View key={item.id} style={styles.itemRow}>
                <TouchableOpacity onPress={() => toggleItem(item)} style={styles.itemLeft}>
                  <Text style={styles.checkbox}>{item.checked ? '✅' : '⬜'}</Text>
                  <View>
                    <Text style={[styles.itemText, item.checked && styles.checked]}>
                      {item.name} <Text style={styles.quantityText}>× {item.quantity}</Text>
                    </Text>
                    <Text style={styles.addedBy}>Added by {item.addedBy}</Text>
                  </View>
                </TouchableOpacity>
                <View style={styles.rightControls}>
                  <View style={styles.qtyControls}>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(item, -1)}>
                      <Text style={styles.qtyBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyValue}>{item.quantity}</Text>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(item, +1)}>
                      <Text style={styles.qtyBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={() => deleteItem(item.id)}>
                    <Text style={styles.delete}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loginContainer:          { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 20 },
  container:               { flex: 1, backgroundColor: '#fff', paddingHorizontal: 20 },
  title:                   { fontSize: 28, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  form:                    { width: '100%' },
  formTitle:               { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  formInput:               { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 12 },
  primaryBtn:              { backgroundColor: '#4CAF50', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  primaryBtnText:          { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  orText:                  { textAlign: 'center', color: '#999', marginVertical: 10 },
  googleBtn:               { backgroundColor: '#4285F4', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 8 },
  googleBtnText:           { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  guestBtn:                { backgroundColor: '#757575', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 20 },
  guestBtnText:            { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  switchText:              { textAlign: 'center', color: '#4285F4', fontSize: 14, marginTop: 10 },
  error:                   { color: 'red', textAlign: 'center', marginBottom: 10 },
  header:                  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 10 },
  welcome:                 { fontSize: 16, color: '#666', marginBottom: 15 },
  signOut:                 { fontSize: 14, color: '#f44336' },
  inputRow:                { flexDirection: 'row', marginBottom: 6 },
  input:                   { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, fontSize: 16 },
  addBtn:                  { backgroundColor: '#4CAF50', padding: 10, borderRadius: 8, marginLeft: 10, justifyContent: 'center', minWidth: 56, alignItems: 'center' },
  addBtnDisabled:          { backgroundColor: '#a5d6a7' },
  addBtnText:              { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  categoryPickerRow:       { marginBottom: 6 },
  categoryPickerLabel:     { fontSize: 13, color: '#666', marginBottom: 4 },
  categoryPickerScroll:    { flexGrow: 0 },
  categoryChip:            { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#ccc', marginRight: 8, backgroundColor: '#f7f7f7' },
  categoryChipActive:      { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  categoryChipText:        { fontSize: 13, color: '#333' },
  categoryChipTextActive:  { color: '#fff', fontWeight: 'bold' },
  suggestionsContainer:    { marginBottom: 8, minHeight: 38 },
  suggestionsLoading:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  suggestionsLoadingText:  { marginLeft: 8, fontSize: 13, color: '#888', fontStyle: 'italic' },
  suggestionsRow:          { flexGrow: 0 },
  suggestionChip:          { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#4CAF50', marginRight: 8, backgroundColor: '#f1f8f1' },
  suggestionText:          { fontSize: 14, color: '#2e7d32' },
  categoryBlock:           { marginBottom: 16 },
  categoryTitle:           { fontSize: 18, fontWeight: 'bold', marginBottom: 8, color: '#333' },
  itemRow:                 { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  itemLeft:                { flexDirection: 'row', alignItems: 'center', flex: 1 },
  checkbox:                { fontSize: 20, marginRight: 10 },
  itemText:                { fontSize: 16 },
  quantityText:            { fontSize: 14, color: '#555' },
  addedBy:                 { fontSize: 12, color: '#999' },
  checked:                 { textDecorationLine: 'line-through', color: '#aaa' },
  rightControls:           { alignItems: 'flex-end' },
  qtyControls:             { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  qtyBtn:                  { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: '#4CAF50', alignItems: 'center', justifyContent: 'center' },
  qtyBtnText:              { color: '#4CAF50', fontSize: 18, fontWeight: 'bold' },
  qtyValue:                { marginHorizontal: 8, fontSize: 16, minWidth: 18, textAlign: 'center' },
  delete:                  { fontSize: 20 },
});
