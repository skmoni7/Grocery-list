import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TextInput,
  TouchableOpacity, FlatList, SafeAreaView
} from 'react-native';
import {
  collection, addDoc, onSnapshot,
  updateDoc, deleteDoc, doc
} from 'firebase/firestore';
import {
  getAuth, signInWithPopup, GoogleAuthProvider,
  signOut, onAuthStateChanged, User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signInAnonymously
} from 'firebase/auth';
import { db } from '../../firebaseConfig';

const auth = getAuth();
const provider = new GoogleAuthProvider();

type GroceryItem = {
  id: string;
  name: string;
  checked: boolean;
  addedBy: string;
};

type Screen = 'login' | 'register';

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

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, 'groceries'), snapshot => {
      setItems(snapshot.docs.map(d => ({
        id: d.id,
        name: d.data().name,
        checked: d.data().checked,
        addedBy: d.data().addedBy
      })));
    });
    return unsub;
  }, [user]);

  const signInGoogle = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const signInEmail = async () => {
    try {
      setError('');
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e: any) {
      setError('Invalid email or password');
    }
  };

  const registerUser = async () => {
    try {
      setError('');
      if (!username.trim()) { setError('Please enter a username'); return; }
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName: username });
    } catch (e: any) {
      if (e.code === 'auth/email-already-in-use') setError('Email already registered');
      else if (e.code === 'auth/weak-password') setError('Password must be 6+ characters');
      else setError(e.message);
    }
  };

  const signInGuest = async () => {
    try {
      setError('');
      if (!guestName.trim()) { setError('Please enter your name'); return; }
      const result = await signInAnonymously(auth);
      await updateProfile(result.user, { displayName: guestName });
    } catch (e: any) {
      setError(e.message);
    }
  };

  const signOutUser = async () => {
    await signOut(auth);
  };

  const addItem = async () => {
    if (text.trim() === '' || !user) return;
    await addDoc(collection(db, 'groceries'), {
      name: text.trim(),
      checked: false,
      addedBy: user.displayName || 'Guest'
    });
    setText('');
  };

  const toggleItem = async (item: GroceryItem) => {
    await updateDoc(doc(db, 'groceries', item.id), { checked: !item.checked });
  };

  const deleteItem = async (id: string) => {
    await deleteDoc(doc(db, 'groceries', id));
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.loginContainer}>
        <Text style={styles.title}>🛒 Grocery List</Text>

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
              <Text style={styles.googleBtnText}>🔑 Sign in with Google</Text>
            </TouchableOpacity>
            <Text style={styles.orText}>— or —</Text>
            {!showGuestInput ? (
              <TouchableOpacity style={styles.guestBtn} onPress={() => setShowGuestInput(true)}>
                <Text style={styles.guestBtnText}>👤 Continue as Guest</Text>
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
                  <Text style={styles.guestBtnText}>👤 Join as Guest</Text>
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
            <TouchableOpacity onPress={() => { setScreen('login'); setError(''); }}>
              <Text style={styles.switchText}>Already have an account? Sign in</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🛒 Grocery List</Text>
        <TouchableOpacity onPress={signOutUser}>
          <Text style={styles.signOut}>Sign out</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.welcome}>
        👋 {user.displayName || 'Guest'} {user.isAnonymous ? '(Guest)' : ''}
      </Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Add an item..."
          value={text}
          onChangeText={setText}
        />
        <TouchableOpacity style={styles.addBtn} onPress={addItem}>
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={items}
        keyExtractor={(i: GroceryItem) => i.id}
        renderItem={({ item }: { item: GroceryItem }) => (
          <View style={styles.itemRow}>
            <TouchableOpacity onPress={() => toggleItem(item)} style={styles.itemLeft}>
              <Text style={styles.checkbox}>{item.checked ? '✅' : '⬜'}</Text>
              <View>
                <Text style={[styles.itemText, item.checked && styles.checked]}>
                  {item.name}
                </Text>
                <Text style={styles.addedBy}>Added by {item.addedBy}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => deleteItem(item.id)}>
              <Text style={styles.delete}>🗑️</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loginContainer: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 20 },
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 20 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 30, textAlign: 'center' },
  form: { width: '100%' },
  formTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  formInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 12 },
  primaryBtn: { backgroundColor: '#4CAF50', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  primaryBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  orText: { textAlign: 'center', color: '#999', marginVertical: 10 },
  googleBtn: { backgroundColor: '#4285F4', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 8 },
  googleBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  guestBtn: { backgroundColor: '#757575', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 20 },
  guestBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  switchText: { textAlign: 'center', color: '#4285F4', fontSize: 14, marginTop: 10 },
  error: { color: 'red', textAlign: 'center', marginBottom: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 20 },
  welcome: { fontSize: 16, color: '#666', marginBottom: 15 },
  signOut: { fontSize: 14, color: '#f44336' },
  inputRow: { flexDirection: 'row', marginBottom: 20 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, fontSize: 16 },
  addBtn: { backgroundColor: '#4CAF50', padding: 10, borderRadius: 8, marginLeft: 10, justifyContent: 'center' },
  addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  itemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  checkbox: { fontSize: 20, marginRight: 10 },
  itemText: { fontSize: 16 },
  addedBy: { fontSize: 12, color: '#999' },
  checked: { textDecorationLine: 'line-through', color: '#aaa' },
  delete: { fontSize: 20 }
});
