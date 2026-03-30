import React, { useEffect, useMemo, useState } from 'react';
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
  'Fruits',
  'Produce',
  'Dairy',
  'Meat',
  'Bakery',
  'Frozen',
  'Drinks',
  'Pantry',
  'Household',
  'Other',
];

const CATEGORY_RULES: { category: string; keywords: string[] }[] = [
  // Fruits
  {
    category: 'Fruits',
    keywords: [
      'apple',
      'banana',
      'orange',
      'grape',
      'strawberry',
      'strawberries',
      'blueberry',
      'blueberries',
      'raspberry',
      'raspberries',
      'blackberry',
      'blackberries',
      'kiwi',
      'mango',
      'pineapple',
      'pear',
      'peach',
      'plum',
      'watermelon',
      'cantaloupe',
      'honeydew',
      'cherry',
      'cherries',
      'lemon',
      'lime',
      'grapefruit',
      'pomegranate',
      'apricot',
      'nectarine',
    ],
  },

  // Produce (veg & greens)
  {
    category: 'Produce',
    keywords: [
      'tomato',
      'tomatoes',
      'onion',
      'onions',
      'garlic',
      'potato',
      'potatoes',
      'sweet potato',
      'sweet potatoes',
      'carrot',
      'carrots',
      'celery',
      'pepper',
      'bell pepper',
      'bell peppers',
      'cucumber',
      'cucumbers',
      'broccoli',
      'cauliflower',
      'spinach',
      'lettuce',
      'romaine',
      'kale',
      'zucchini',
      'squash',
      'green bean',
      'green beans',
      'herbs',
      'cilantro',
      'parsley',
    ],
  },

  { category: 'Dairy', keywords: ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'egg', 'eggs', 'sour cream', 'cottage cheese'] },
  { category: 'Meat', keywords: ['chicken', 'beef', 'pork', 'turkey', 'fish', 'salmon', 'shrimp', 'bacon', 'ham', 'steak', 'sausage'] },
  { category: 'Bakery', keywords: ['bread', 'bagel', 'bun', 'muffin', 'croissant', 'cake', 'donut', 'tortilla', 'roll'] },
  { category: 'Frozen', keywords: ['frozen', 'ice cream', 'pizza', 'waffle', 'fries', 'nugget', 'ice'] },
  { category: 'Drinks', keywords: ['water', 'soda', 'juice', 'coffee', 'tea', 'milkshake', 'energy drink', 'sports drink'] },
  { category: 'Pantry', keywords: ['rice', 'pasta', 'beans', 'cereal', 'flour', 'sugar', 'salt', 'oil', 'sauce', 'spaghetti', 'oats'] },
  { category: 'Household', keywords: ['soap', 'paper towel', 'tissue', 'detergent', 'toilet paper', 'trash bag', 'cleaner', 'sponge'] },
];

const SUGGESTIONS = [
  // Fruits
  'Apples',
  'Bananas',
  'Oranges',
  'Grapes',
  'Strawberries',
  'Blueberries',
  'Raspberries',
  'Blackberries',
  'Kiwis',
  'Mangoes',
  'Pineapple',
  'Pears',
  'Peaches',
  'Plums',
  'Cherries',
  'Watermelon',
  'Cantaloupe',
  'Honeydew melon',
  'Grapefruit',
  'Pomegranate',
  'Lemons',
  'Limes',

  // Vegetables & greens (Produce)
  'Roma tomatoes',
  'Grape tomatoes',
  'Onions',
  'Red onions',
  'Garlic',
  'Potatoes',
  'Sweet potatoes',
  'Carrots',
  'Celery',
  'Bell peppers',
  'Cucumbers',
  'Broccoli',
  'Cauliflower',
  'Spinach',
  'Mixed salad',
  'Romaine lettuce',
  'Iceberg lettuce',
  'Avocados',
  'Mushrooms',
  'Zucchini',

  // Meat & Seafood
  'Chicken breast',
  'Chicken thighs',
  'Whole chicken',
  'Ground beef',
  'Beef stew meat',
  'Pork chops',
  'Pork shoulder',
  'Ground turkey',
  'Bacon',
  'Ham',
  'Sausage links',
  'Hot dogs',
  'Tilapia fillets',
  'Salmon fillets',
  'Frozen shrimp',

  // Dairy & Eggs
  'Whole milk',
  '2% milk',
  'Almond milk',
  'Oat milk',
  'Greek yogurt',
  'Plain yogurt',
  'Sliced cheese',
  'Shredded cheese',
  'Block cheddar cheese',
  'Mozzarella cheese',
  'Butter',
  'Whipping cream',
  'Eggs',
  'Cottage cheese',
  'Cream cheese',
  'Sour cream',

  // Snacks & Candy
  'Potato chips',
  'Tortilla chips',
  'Pretzels',
  'Popcorn',
  'Crackers',
  'Granola bars',
  'Fruit snacks',
  'Chocolate bar',
  'Gummy candy',
  'Trail mix',

  // Frozen Foods
  'Frozen pizza',
  'Frozen french fries',
  'Frozen vegetables',
  'Frozen fruit',
  'Frozen waffles',
  'Frozen pancakes',
  'Ice cream',
  'Frozen chicken nuggets',
  'Frozen fish sticks',

  // Bakery & Bread
  'White bread',
  'Whole wheat bread',
  'Multigrain bread',
  'Burger buns',
  'Hot dog buns',
  'Tortillas',
  'Bagels',
  'English muffins',
  'Dinner rolls',
  'Croissants',

  // Pantry Essentials
  'Spaghetti',
  'Penne pasta',
  'Rice',
  'Brown rice',
  'Quinoa',
  'Black beans',
  'Kidney beans',
  'Chickpeas',
  'Canned corn',
  'Canned tomatoes',
  'Tomato sauce',
  'Pasta sauce',
  'Canned tuna',
  'Peanut butter',
  'Jelly',
  'Flour',
  'Sugar',
  'Brown sugar',
  'Powdered sugar',
  'Baking powder',
  'Baking soda',
  'Salt',
  'Black pepper',
  'Olive oil',
  'Vegetable oil',
  'Vinegar',
  'Chicken broth',
  'Beef broth',
  'Bouillon cubes',

  // Beverages
  'Bottled water',
  'Sparkling water',
  'Orange juice',
  'Apple juice',
  'Lemonade',
  'Soda',
  'Iced tea',
  'Coffee',
  'Ground coffee',
  'Coffee pods',
  'Tea bags',
  'Sports drink',

  // Breakfast & Cereals
  'Corn flakes',
  'Oat cereal',
  'Granola cereal',
  'Instant oatmeal',
  'Old fashioned oats',
  'Maple syrup',
  'Pancake mix',

  // Deli & Prepared
  'Sliced turkey',
  'Sliced ham',
  'Sliced salami',
  'Cheese slices',
  'Hummus',
  'Premade salad',
  'Premade pasta salad',

  // Household Essentials
  'Paper towels',
  'Toilet paper',
  'Facial tissue',
  'Trash bags',
  'Dish soap',
  'Dishwasher tablets',
  'Laundry detergent',
  'Fabric softener',
  'Glass cleaner',
  'All-purpose cleaner',
  'Sponges',
  'Aluminum foil',
  'Plastic wrap',
  'Sandwich bags',
  'Freezer bags',

  // Personal Care
  'Shampoo',
  'Conditioner',
  'Body wash',
  'Bar soap',
  'Toothpaste',
  'Toothbrush',
  'Deodorant',
  'Razor blades',
  'Hand soap',
  'Lotion',

  // Baby Items
  'Diapers',
  'Baby wipes',
  'Baby formula',
  'Baby snacks',
  'Baby shampoo',

  // Pet Supplies
  'Dry dog food',
  'Wet dog food',
  'Dry cat food',
  'Wet cat food',
  'Cat litter',
  'Dog treats',
  'Cat treats',
];

function detectCategory(name: string) {
  const value = name.toLowerCase().trim();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some(k => value.includes(k))) return rule.category;
  }
  return 'Other';
}

export default function App() {
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [text, setText] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [screen, setScreen] = useState<Screen>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [guestName, setGuestName] = useState('');
  const [showGuestInput, setShowGuestInput] = useState(false);
  const [error, setError] = useState('');
  const [manualCategory, setManualCategory] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setUser(u));
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, 'groceries'), snapshot => {
      setItems(
        snapshot.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({
          id: d.id,
          name: String(d.data().name ?? ''),
          checked: Boolean(d.data().checked),
          addedBy: String(d.data().addedBy ?? ''),
          category: String(d.data().category ?? 'Other'),
          quantity: Number(d.data().quantity ?? 1),
        }))
      );
    });
    return unsub;
  }, [user]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, GroceryItem[]> = {};
    for (const item of items) {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [items]);

  const filteredSuggestions = useMemo(() => {
    const value = text.trim().toLowerCase();
    if (!value) return [];
    return SUGGESTIONS.filter(s => s.toLowerCase().includes(value)).slice(0, 8);
  }, [text]);

  const signInGoogle = async () => {
    try {
      setError('');
      if (Platform.OS !== 'web') {
        Alert.alert('Google sign-in', 'Google popup login is enabled for web. Use the web app or a native auth flow.');
        return;
      }
      await signInWithPopup(auth, provider);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const signInEmail = async () => {
    try {
      setError('');
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch {
      setError('Invalid email or password');
    }
  };

  const registerUser = async () => {
    try {
      setError('');
      if (!username.trim()) {
        setError('Please enter a username');
        return;
      }
      const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(result.user, { displayName: username.trim() });
    } catch (e: any) {
      if (e.code === 'auth/email-already-in-use') setError('Email already registered');
      else if (e.code === 'auth/weak-password') setError('Password must be 6+ characters');
      else setError(e.message);
    }
  };

  const signInGuest = async () => {
    try {
      setError('');
      if (!guestName.trim()) {
        setError('Please enter your name');
        return;
      }
      const result = await signInAnonymously(auth);
      await updateProfile(result.user, { displayName: guestName.trim() });
    } catch (e: any) {
      setError(e.message);
    }
  };

  const signOutUser = async () => {
    await signOut(auth);
  };

  const addItem = async (nameOverride?: string) => {
    const value = (nameOverride ?? text).trim();
    if (!value || !user) return;

    const detected = detectCategory(value);
    const finalCategory =
      detected === 'Other' && manualCategory ? manualCategory : detected;

    await addDoc(collection(db, 'groceries'), {
      name: value,
      checked: false,
      addedBy: user.displayName || user.email || 'Guest',
      category: finalCategory,
      quantity: 1,
    });

    setText('');
    setManualCategory(null);
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

  if (!user) {
    return (
      <SafeAreaView style={styles.loginContainer}>
        <Text style={styles.title}>Grocery List</Text>

        {screen === 'login' ? (
          <View style={styles.form}>
            <Text style={styles.formTitle}>Sign In</Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <TextInput
              style={styles.formInput}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={styles.formInput}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <TouchableOpacity style={styles.primaryBtn} onPress={signInEmail}>
              <Text style={styles.primaryBtnText}>Sign In</Text>
            </TouchableOpacity>

            <Text style={styles.orText}>— or —</Text>

            <TouchableOpacity style={styles.googleBtn} onPress={signInGoogle}>
              <Text style={styles.googleBtnText}>Sign in with Google</Text>
            </TouchableOpacity>

            <Text style={styles.orText}>— or —</Text>

            {!showGuestInput ? (
              <TouchableOpacity
                style={styles.guestBtn}
                onPress={() => setShowGuestInput(true)}
              >
                <Text style={styles.guestBtnText}>Continue as Guest</Text>
              </TouchableOpacity>
            ) : (
              <View>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter your name"
                  value={guestName}
                  onChangeText={setGuestName}
                />
                <TouchableOpacity style={styles.guestBtn} onPress={signInGuest}>
                  <Text style={styles.guestBtnText}>Join as Guest</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              onPress={() => {
                setScreen('register');
                setError('');
              }}
            >
              <Text style={styles.switchText}>No account? Create one</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.formTitle}>Create Account</Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <TextInput
              style={styles.formInput}
              placeholder="Username"
              value={username}
              onChangeText={setUsername}
            />
            <TextInput
              style={styles.formInput}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={styles.formInput}
              placeholder="Password (6+ characters)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <TouchableOpacity style={styles.primaryBtn} onPress={registerUser}>
              <Text style={styles.primaryBtnText}>Create Account</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setScreen('login');
                setError('');
              }}
            >
              <Text style={styles.switchText}>
                Already have an account? Sign in
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    );
  }

  const pendingValue = text.trim();
  const pendingDetected =
    pendingValue.length > 0 ? detectCategory(pendingValue) : null;

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
        />
        <TouchableOpacity style={styles.addBtn} onPress={() => addItem()}>
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {pendingValue && pendingDetected === 'Other' && (
        <View style={styles.categoryPickerRow}>
          <Text style={styles.categoryPickerLabel}>Choose category:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryPickerScroll}
          >
            {CATEGORY_OPTIONS.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryChip,
                  manualCategory === cat && styles.categoryChipActive,
                ]}
                onPress={() => setManualCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    manualCategory === cat && styles.categoryChipTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {filteredSuggestions.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.suggestionsRow}
        >
          {filteredSuggestions.map(s => (
            <TouchableOpacity
              key={s}
              style={styles.suggestionChip}
              onPress={() => handleSuggestionPress(s)}
            >
              <Text style={styles.suggestionText}>{s}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <FlatList
        data={groupedItems}
        keyExtractor={([category]) => category}
        renderItem={({ item: [category, categoryItems] }) => (
          <View style={styles.categoryBlock}>
            <Text style={styles.categoryTitle}>{category}</Text>
            {categoryItems.map(item => (
              <View key={item.id} style={styles.itemRow}>
                <TouchableOpacity
                  onPress={() => toggleItem(item)}
                  style={styles.itemLeft}
                >
                  <Text style={styles.checkbox}>
                    {item.checked ? '✅' : '⬜'}
                  </Text>
                  <View>
                    <Text
                      style={[styles.itemText, item.checked && styles.checked]}
                    >
                      {item.name}{' '}
                      <Text style={styles.quantityText}>× {item.quantity}</Text>
                    </Text>
                    <Text style={styles.addedBy}>
                      Added by {item.addedBy}
                    </Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.rightControls}>
                  <View style={styles.qtyControls}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => updateQuantity(item, -1)}
                    >
                      <Text style={styles.qtyBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyValue}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => updateQuantity(item, +1)}
                    >
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
  loginContainer: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 20 },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  form: { width: '100%' },
  formTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  primaryBtn: {
    backgroundColor: '#4CAF50',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  orText: { textAlign: 'center', color: '#999', marginVertical: 10 },
  googleBtn: {
    backgroundColor: '#4285F4',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  googleBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  guestBtn: {
    backgroundColor: '#757575',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  guestBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  switchText: { textAlign: 'center', color: '#4285F4', fontSize: 14, marginTop: 10 },
  error: { color: 'red', textAlign: 'center', marginBottom: 10 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  welcome: { fontSize: 16, color: '#666', marginBottom: 15 },
  signOut: { fontSize: 14, color: '#f44336' },
  inputRow: { flexDirection: 'row', marginBottom: 6 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  addBtn: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 8,
    marginLeft: 10,
    justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  categoryPickerRow: { marginBottom: 6 },
  categoryPickerLabel: { fontSize: 13, color: '#666', marginBottom: 4 },
  categoryPickerScroll: { flexGrow: 0 },
  categoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    marginRight: 8,
    backgroundColor: '#f7f7f7',
  },
  categoryChipActive: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  categoryChipText: { fontSize: 13, color: '#333' },
  categoryChipTextActive: { color: '#fff', fontWeight: 'bold' },
  suggestionsRow: { marginBottom: 8 },
  suggestionChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    marginRight: 8,
    backgroundColor: '#f7f7f7',
  },
  suggestionText: { fontSize: 14, color: '#333' },
  categoryBlock: { marginBottom: 16 },
  categoryTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8, color: '#333' },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  checkbox: { fontSize: 20, marginRight: 10 },
  itemText: { fontSize: 16 },
  quantityText: { fontSize: 14, color: '#555' },
  addedBy: { fontSize: 12, color: '#999' },
  checked: { textDecorationLine: 'line-through', color: '#aaa' },
  rightControls: { alignItems: 'flex-end' },
  qtyControls: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: { color: '#4CAF50', fontSize: 18, fontWeight: 'bold' },
  qtyValue: { marginHorizontal: 8, fontSize: 16, minWidth: 18, textAlign: 'center' },
  delete: { fontSize: 20 },
});