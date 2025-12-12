/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useMemo, useState, useEffect } from 'react';
import {
  Alert,
  Modal,
  ImageBackground,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

type Screen = 'home' | 'signin' | 'signup' | 'hub' | 'orders' | 'orderEdit' | 'exitInspections' | 'warehouse' | 'newWarehouseOrder' | 'maintenance' | 'maintenanceTasks' | 'maintenanceTaskDetail' | 'newMaintenanceTask';
type OrderStatus = 'חדש' | 'באישור' | 'שולם חלקית' | 'שולם' | 'בוטל';
type InspectionStatus = 'צריך ביקורת' | 'בביצוע' | 'הושלם';

type Order = {
  id: string;
  guestName: string;
  unitNumber: string;
  arrivalDate: string;
  departureDate: string;
  status: OrderStatus;
  guestsCount: number;
  specialRequests?: string;
  internalNotes?: string;
  paidAmount: number;
  totalAmount: number;
  paymentMethod: string;
};

type InspectionMission = {
  id: string;
  orderId: string;
  unitNumber: string;
  guestName: string;
  departureDate: string;
  status: InspectionStatus;
  tasks: InspectionTask[];
};

type InspectionTask = {
  id: string;
  name: string;
  completed: boolean;
};

type InventoryItem = {
  id: string;
  name: string;
  category: 'מצעים' | 'מוצרי ניקיון' | 'ציוד מתכלה' | 'אחר';
  unit: string;
  currentStock: number;
  minStock: number;
};

type InventoryOrder = {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  unit: string;
  orderDate: string;
  deliveryDate?: string;
  status: 'ממתין לאישור' | 'מאושר' | 'בהזמנה' | 'התקבל' | 'בוטל';
  orderType: 'הזמנת עובד' | 'הזמנה כללית';
  orderedBy?: string;
  unitNumber?: string;
};

type MaintenanceStatus = 'פתוח' | 'בטיפול' | 'סגור';
type MaintenancePriority = 'נמוך' | 'בינוני' | 'גבוה' | 'דחוף';

type MaintenanceTask = {
  id: string;
  unitId: string;
  title: string;
  description: string;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  createdDate: string;
  assignedTo?: string;
  imageUri?: string;
  category: string;
};

type MaintenanceUnit = {
  id: string;
  name: string;
  type: 'יחידה' | 'קוטג׳';
  tasks: MaintenanceTask[];
};

const statusOptions: OrderStatus[] = [
  'חדש',
  'באישור',
  'שולם חלקית',
  'שולם',
  'בוטל',
];

const paymentOptions = [
  'מזומן',
  'אשראי',
  'העברה בנקאית',
  'ביט',
  'צ׳ק',
  'אחר',
];

const seaBackground = {
  uri: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80',
};

const initialOrders: Order[] = [
  {
    id: 'ORD-001',
    guestName: 'נועם כהן',
    unitNumber: 'יחידה 3',
    arrivalDate: '2025-12-20',
    departureDate: '2025-12-23',
    status: 'באישור',
    guestsCount: 4,
    specialRequests: 'בקשה ללול תינוק',
    internalNotes: 'לוודא ניקיון יסודי לפני ההגעה',
    paidAmount: 1200,
    totalAmount: 2200,
    paymentMethod: 'אשראי',
  },
  {
    id: 'ORD-002',
    guestName: 'שירה לוי',
    unitNumber: 'יחידה 1',
    arrivalDate: '2025-12-18',
    departureDate: '2025-12-19',
    status: 'שולם חלקית',
    guestsCount: 2,
    specialRequests: 'הגעה מאוחרת',
    internalNotes: 'לסמן ביקורת יציאה',
    paidAmount: 700,
    totalAmount: 1200,
    paymentMethod: 'מזומן',
  },
  {
    id: 'ORD-003',
    guestName: 'אורי ישראלי',
    unitNumber: 'קוטג׳ 2',
    arrivalDate: '2025-12-25',
    departureDate: '2025-12-28',
    status: 'חדש',
    guestsCount: 3,
    specialRequests: '',
    internalNotes: 'להציע שדרוג ארוחת בוקר',
    paidAmount: 0,
    totalAmount: 1600,
    paymentMethod: 'טרם נקבע',
  },
];

const initialInventoryItems: InventoryItem[] = [
  { id: 'INV-001', name: 'מצעים יחידים', category: 'מצעים', unit: 'סט', currentStock: 45, minStock: 30 },
  { id: 'INV-002', name: 'מצעים זוגיים', category: 'מצעים', unit: 'סט', currentStock: 35, minStock: 25 },
  { id: 'INV-003', name: 'כריות', category: 'מצעים', unit: 'יחידה', currentStock: 80, minStock: 50 },
  { id: 'INV-004', name: 'שמיכות', category: 'מצעים', unit: 'יחידה', currentStock: 60, minStock: 40 },
  { id: 'INV-005', name: 'מגבות אמבטיה', category: 'מצעים', unit: 'יחידה', currentStock: 120, minStock: 80 },
  { id: 'INV-006', name: 'מגבות יד', category: 'מצעים', unit: 'יחידה', currentStock: 150, minStock: 100 },
  { id: 'INV-007', name: 'דטרגנט', category: 'מוצרי ניקיון', unit: 'ליטר', currentStock: 25, minStock: 15 },
  { id: 'INV-008', name: 'מרכך כביסה', category: 'מוצרי ניקיון', unit: 'ליטר', currentStock: 18, minStock: 10 },
  { id: 'INV-009', name: 'חומר ניקוי כללי', category: 'מוצרי ניקיון', unit: 'ליטר', currentStock: 30, minStock: 20 },
  { id: 'INV-010', name: 'חומר ניקוי שירותים', category: 'מוצרי ניקיון', unit: 'ליטר', currentStock: 20, minStock: 12 },
  { id: 'INV-011', name: 'ספוגים', category: 'מוצרי ניקיון', unit: 'יחידה', currentStock: 50, minStock: 30 },
  { id: 'INV-012', name: 'שקיות זבל', category: 'ציוד מתכלה', unit: 'רול', currentStock: 40, minStock: 25 },
  { id: 'INV-013', name: 'סבון ידיים', category: 'ציוד מתכלה', unit: 'בקבוק', currentStock: 35, minStock: 20 },
  { id: 'INV-014', name: 'נייר טואלט', category: 'ציוד מתכלה', unit: 'רול', currentStock: 100, minStock: 60 },
  { id: 'INV-015', name: 'מפיות נייר', category: 'ציוד מתכלה', unit: 'חבילה', currentStock: 45, minStock: 30 },
];

const initialInventoryOrders: InventoryOrder[] = [
  {
    id: 'ORD-INV-001',
    itemId: 'INV-001',
    itemName: 'מצעים יחידים',
    quantity: 20,
    unit: 'סט',
    orderDate: '2025-12-15',
    deliveryDate: '2025-12-20',
    status: 'מאושר',
    orderType: 'הזמנה כללית',
  },
  {
    id: 'ORD-INV-002',
    itemId: 'INV-007',
    itemName: 'דטרגנט',
    quantity: 15,
    unit: 'ליטר',
    orderDate: '2025-12-18',
    status: 'ממתין לאישור',
    orderType: 'הזמנת עובד',
    orderedBy: 'שירה לוי',
    unitNumber: 'יחידה 1',
  },
];

const initialMaintenanceUnits: MaintenanceUnit[] = [
  {
    id: 'unit-1',
    name: 'יחידה 1',
    type: 'יחידה',
    tasks: [
      {
        id: 'task-1',
        unitId: 'unit-1',
        title: 'תיקון מזגן',
        description: 'המזגן ביחידה לא עובד, צריך לבדוק ולתקן',
        status: 'פתוח',
        priority: 'גבוה',
        createdDate: '2024-01-15',
        category: 'מזגן',
      },
      {
        id: 'task-2',
        unitId: 'unit-1',
        title: 'צביעת קירות',
        description: 'צריך לצבוע את הקירות בחדר השינה',
        status: 'בטיפול',
        priority: 'בינוני',
        createdDate: '2024-01-10',
        assignedTo: 'יוסי כהן',
        category: 'צבע',
      },
    ],
  },
  {
    id: 'unit-2',
    name: 'יחידה 2',
    type: 'יחידה',
    tasks: [
      {
        id: 'task-3',
        unitId: 'unit-2',
        title: 'תיקון דלת',
        description: 'הדלת הראשית לא נסגרת כמו שצריך',
        status: 'פתוח',
        priority: 'בינוני',
        createdDate: '2024-01-20',
        category: 'תיקון',
      },
    ],
  },
  {
    id: 'unit-3',
    name: 'יחידה 3',
    type: 'יחידה',
    tasks: [],
  },
  {
    id: 'cottage-1',
    name: 'קוטג׳ 1',
    type: 'קוטג׳',
    tasks: [
      {
        id: 'task-4',
        unitId: 'cottage-1',
        title: 'תחזוקה שוטפת',
        description: 'תחזוקה שוטפת חודשית - בדיקת כל המערכות',
        status: 'פתוח',
        priority: 'נמוך',
        createdDate: '2024-02-01',
        category: 'תחזוקה שוטפת',
      },
    ],
  },
  {
    id: 'cottage-2',
    name: 'קוטג׳ 2',
    type: 'קוטג׳',
    tasks: [],
  },
];

function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const safeAreaInsets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [userName, setUserName] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [screen, setScreen] = useState<Screen>('home');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [inspectionMissions, setInspectionMissions] = useState<InspectionMission[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(initialInventoryItems);
  const [inventoryOrders, setInventoryOrders] = useState<InventoryOrder[]>(initialInventoryOrders);
  const [selectedUnit, setSelectedUnit] = useState<string>('כל המתחמים');
  const [maintenanceUnits, setMaintenanceUnits] = useState<MaintenanceUnit[]>(initialMaintenanceUnits);
  const [selectedMaintenanceUnitId, setSelectedMaintenanceUnitId] = useState<string | null>(null);
  const [selectedMaintenanceTaskId, setSelectedMaintenanceTaskId] = useState<string | null>(null);
  const statusBarStyle = screen === 'home' ? 'light-content' : 'dark-content';
  const statusBar = <StatusBar barStyle={statusBarStyle} />;

  const totals = useMemo(() => {
    const totalPaid = orders.reduce((sum, o) => sum + o.paidAmount, 0);
    return { count: orders.length, totalPaid };
  }, [orders]);

  const defaultInspectionTasks: InspectionTask[] = useMemo(() => [
    { id: '1', name: 'ניקיון חדרים', completed: false },
    { id: '2', name: 'ניקיון מטבח', completed: false },
    { id: '3', name: 'ניקיון שירותים', completed: false },
    { id: '4', name: 'בדיקת מכשירים', completed: false },
    { id: '5', name: 'בדיקת מצב ריהוט', completed: false },
    { id: '6', name: 'החלפת מצעים', completed: false },
    { id: '7', name: 'החלפת מגבות', completed: false },
    { id: '8', name: 'בדיקת מלאי', completed: false },
  ], []);

  useEffect(() => {
    const newMissions: InspectionMission[] = [];
    orders
      .filter(order => order.status !== 'בוטל')
      .forEach(order => {
        const existing = inspectionMissions.find(m => m.orderId === order.id);
        if (!existing) {
          newMissions.push({
            id: `INSP-${order.id}`,
            orderId: order.id,
            unitNumber: order.unitNumber,
            guestName: order.guestName,
            departureDate: order.departureDate,
            status: 'צריך ביקורת' as InspectionStatus,
            tasks: defaultInspectionTasks.map(t => ({ ...t })),
          });
        }
      });
    
    if (newMissions.length > 0) {
      setInspectionMissions(prev => [...prev, ...newMissions]);
    }
  }, [orders, defaultInspectionTasks]);

  const handleSign = (mode: 'signin' | 'signup') => {
    if (!name.trim() || !password.trim()) {
      setError('אנא מלאו שם וסיסמה');
      return;
    }
    if (mode === 'signup' && password !== confirmPassword) {
      setError('הסיסמאות אינן תואמות');
      return;
    }
    setError('');
    setUserName(name.trim());
    setScreen('hub');
  };

  const updateOrder = (
    id: string,
    changes: Partial<Pick<Order, 'status' | 'paidAmount' | 'paymentMethod'>>,
  ) => {
    setOrders(prev =>
      prev.map(o => (o.id === id ? { ...o, ...changes } : o)),
    );
  };

  if (screen === 'home') {
    return (
      <SafeAreaView style={styles.fullBleed}>
        {statusBar}
        <ImageBackground
          source={seaBackground}
          style={styles.bg}
          imageStyle={styles.bgImage}
        >
          <View style={styles.bgOverlay} />

          <View
            style={[styles.topBar, { paddingTop: safeAreaInsets.top + 4 }]}
          >
            <View style={styles.brandBadge}>
              <View style={styles.brandDot} />
              <Text style={styles.brandText}>Seisignes</Text>
            </View>
            <View style={styles.topChip}>
              <Text style={styles.topChipText}>מתחם נופש בוטיק</Text>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={styles.heroScroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.heroCopy}>
              <Text style={styles.kicker}>חלון ניהול חכם</Text>
              <Text style={styles.heroHeading}>Seisignes Retreat</Text>
              <Text style={styles.heroBody}>
                ניהול אורחים, הזמנות ותחזוקה מתוך ממשק אחד אלגנטי. שליטה מלאה
                במצב המתחם, תשלומים ועדכוני צוות בזמן אמת.
              </Text>
            </View>

            <View style={styles.glassRow}>
              <View style={styles.glassCard}>
                <Text style={styles.glassTitle}>הזמנות פעילות</Text>
                <Text style={styles.glassValue}>{totals.count}</Text>
                <Text style={styles.glassSmall}>היום במערכת</Text>
              </View>
              <View style={styles.glassCard}>
                <Text style={styles.glassTitle}>תשלומים מאושרים</Text>
                <Text style={styles.glassValue}>
                  ₪{totals.totalPaid.toLocaleString('he-IL')}
                </Text>
                <Text style={styles.glassSmall}>עדכון חי</Text>
              </View>
            </View>

            <View style={styles.ctaCard}>
              <Text style={styles.ctaTitle}>התחברות מהירה</Text>
              <Text style={styles.ctaText}>
                המשיכו לניהול מלא של Seisignes: ביקורות יציאה, חשבוניות, מחסן
                ותקשורת צוות.
              </Text>
              <View style={styles.ctaButtons}>
                <PrimaryButton
                  label="כניסה"
                  onPress={() => setScreen('signin')}
                  style={styles.ctaPrimary}
                />
                <OutlineButton
                  label="הרשמה"
                  onPress={() => setScreen('signup')}
                  style={styles.ctaOutline}
                />
              </View>
            </View>

            <View style={styles.tagRow}>
              <View style={styles.tag}>
                <Text style={styles.tagText}>זמני הגעה</Text>
              </View>
              <View style={styles.tag}>
                <Text style={styles.tagText}>ביקורות יציאה</Text>
              </View>
              <View style={styles.tag}>
                <Text style={styles.tagText}>צ׳אט צוות</Text>
              </View>
            </View>
          </ScrollView>
        </ImageBackground>
      </SafeAreaView>
    );
  }

  if (!userName && (screen === 'signin' || screen === 'signup')) {
    return (
      <SafeAreaView
        style={[styles.container, { paddingTop: safeAreaInsets.top }]}
      >
        {statusBar}
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>
            {screen === 'signin' ? 'כניסה' : 'הרשמה'}
          </Text>
          <Text style={styles.subtitle}>ניהול מתחם נופש – הזדהות מאובטחת</Text>
          <View style={styles.card}>
            <View style={styles.field}>
              <Text style={styles.label}>שם משתמש</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="הקלד שם"
                placeholderTextColor="#94a3b8"
                textAlign="right"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>סיסמה</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••"
                placeholderTextColor="#94a3b8"
                secureTextEntry
                textAlign="right"
              />
            </View>
            {screen === 'signup' ? (
              <View style={styles.field}>
                <Text style={styles.label}>אישור סיסמה</Text>
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="••••••"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry
                  textAlign="right"
                />
              </View>
            ) : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PrimaryButton
              label={screen === 'signin' ? 'כניסה' : 'הרשמה'}
              onPress={() => handleSign(screen)}
            />
            <OutlineButton
              label="חזרה למסך הבית"
              onPress={() => setScreen('home')}
              style={{ marginTop: 10 }}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'hub') {
    const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const pendingAmount = totalRevenue - totals.totalPaid;
    const activeOrders = orders.filter(o => o.status !== 'בוטל' && o.status !== 'שולם').length;
    const completedOrders = orders.filter(o => o.status === 'שולם').length;
    
    return (
      <SafeAreaView style={[styles.hubContainer, { paddingTop: safeAreaInsets.top }]}>
        {statusBar}
        <ScrollView
          contentContainerStyle={styles.hubScroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hubTopRow}>
            <View style={styles.brandBadge}>
              <View style={styles.brandDot} />
              <Text style={styles.brandText}>Seisignes</Text>
            </View>
            <View style={styles.userChip}>
              <Text style={styles.userChipText}>שלום {userName}</Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: '#dbeafe', borderColor: '#3b82f6' }]}>
              <Text style={styles.statValue}>{totals.count}</Text>
              <Text style={styles.statLabel}>מספר הזמנות</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#dcfce7', borderColor: '#22c55e' }]}>
              <Text style={styles.statValue}>₪{totalRevenue.toLocaleString('he-IL')}</Text>
              <Text style={styles.statLabel}>הכנסות</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#fee2e2', borderColor: '#ef4444' }]}>
              <Text style={styles.statValue}>₪0</Text>
              <Text style={styles.statLabel}>הוצאות</Text>
            </View>
          </View>

          <View style={styles.progressSection}>
            <Text style={styles.sectionTitle}>סטטוס תשלומים</Text>
            <View style={styles.progressCard}>
              <View style={styles.progressInfo}>
                <Text style={styles.progressLabel}>שולם: ₪{totals.totalPaid.toLocaleString('he-IL')}</Text>
                <Text style={styles.progressPercent}>
                  {totalRevenue > 0 ? Math.round((totals.totalPaid / totalRevenue) * 100) : 0}%
                </Text>
              </View>
              <View style={styles.progressBarLarge}>
                <View
                  style={[
                    styles.progressFillLarge,
                    {
                      width: `${totalRevenue > 0 ? (totals.totalPaid / totalRevenue) * 100 : 0}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressNote}>
                מתוך ₪{totalRevenue.toLocaleString('he-IL')} סה״כ
              </Text>
            </View>
          </View>

          <View style={styles.quickActions}>
            <Text style={styles.sectionTitle}>פעולות מהירות</Text>
            <View style={styles.quickActionsRow}>
              <Pressable
                style={[styles.quickActionBtn, { backgroundColor: '#3b82f6' }]}
                onPress={() => setScreen('orders')}
              >
                <Text style={styles.quickActionIcon}>📑</Text>
                <Text style={styles.quickActionText}>הזמנות</Text>
              </Pressable>
              <Pressable
                style={[styles.quickActionBtn, { backgroundColor: '#22c55e' }]}
                onPress={() => {}}
              >
                <Text style={styles.quickActionIcon}>🧹</Text>
                <Text style={styles.quickActionText}>ביקורת</Text>
              </Pressable>
              <Pressable
                style={[styles.quickActionBtn, { backgroundColor: '#f59e0b' }]}
                onPress={() => {}}
              >
                <Text style={styles.quickActionIcon}>📦</Text>
                <Text style={styles.quickActionText}>מחסן</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.optionGrid}>
            <OptionCard
              title="הזמנות"
              icon="📑"
              accent="#38bdf8"
              details={[
                'רשימת הזמנות מלאה, פרטי אורח ומספר יחידה',
                'עדכון סכום ששולם, אופן תשלום וסטטוס',
                'סיכום מלא והוצאות כולל יצוא לאקסל',
              ]}
              cta="פתח הזמנות"
              onPress={() => setScreen('orders')}
            />
            <OptionCard
              title="ביקורת יציאה"
              icon="🧹"
              accent="#f97316"
              details={[
                'משימות ניקיון לאחר עזיבה',
                'סטטוסים: צריך ביקורת / בביצוע / הושלם',
              ]}
              cta="פתח ביקורות"
              onPress={() => setScreen('exitInspections')}
            />
            <OptionCard
              title="מחסן"
              icon="📦"
              accent="#a78bfa"
              details={[
                'רשימת פריטי מלאי: מצעים, מוצרי ניקיון, ציוד מתכלה',
                'יצירת הזמנות פנימיות וצפייה בסטטוס',
                'הזמנות עתידיות ובחירת מתחם',
              ]}
              cta="פתח מחסן"
              onPress={() => setScreen('warehouse')}
            />
            <OptionCard
              title="תחזוקה"
              icon="🛠️"
              accent="#22c55e"
              details={[
                'רשימת יחידות נופש והמצב התחזוקתי',
                'משימות תחזוקה עם תמונות וסטטוס',
                'יצירת משימות חדשות ועדכון קיימות',
              ]}
              cta="פתח תחזוקה"
              onPress={() => setScreen('maintenance')}
            />
            <OptionCard
              title="חשבוניות"
              icon="🧾"
              accent="#0ea5e9"
              details={['העלאת PDF/תמונה', 'OCR לזיהוי ספק, תאריך וסכום']}
            />
            <OptionCard
              title="צ׳אט פנימי"
              icon="💬"
              accent="#eab308"
              details={['תקשורת צוות והתראות']}
            />
            <OptionCard
              title="שעון נוכחות"
              icon="⏱️"
              accent="#ec4899"
              details={['נוכחות לפי שעה ועלות']}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'orderEdit') {
    const currentOrder = orders.find(o => o.id === selectedOrderId);
    if (!currentOrder) {
      setScreen('orders');
      return null;
    }
    return (
      <OrderEditScreen
        order={currentOrder}
        onSave={(id, changes) => {
          setOrders(prev =>
            prev.map(o => (o.id === id ? { ...o, ...changes } : o)),
          );
          setScreen('orders');
        }}
        onCancel={() => setScreen('orders')}
      />
    );
  }

  if (screen === 'exitInspections') {
    return (
      <ExitInspectionsScreen
        missions={inspectionMissions}
        onUpdateMission={(id, updates) => {
          setInspectionMissions(prev =>
            prev.map(m => (m.id === id ? { ...m, ...updates } : m)),
          );
        }}
        onBack={() => setScreen('hub')}
        safeAreaInsets={safeAreaInsets}
        statusBar={statusBar}
      />
    );
  }

  if (screen === 'warehouse') {
    return (
      <WarehouseScreen
        items={inventoryItems}
        orders={inventoryOrders}
        selectedUnit={selectedUnit}
        onSelectUnit={setSelectedUnit}
        onAddOrder={(order) => {
          setInventoryOrders(prev => [...prev, order]);
        }}
        onUpdateOrder={(id, updates) => {
          setInventoryOrders(prev =>
            prev.map(o => (o.id === id ? { ...o, ...updates } : o)),
          );
        }}
        onBack={() => setScreen('hub')}
        onNewOrder={() => setScreen('newWarehouseOrder')}
        safeAreaInsets={safeAreaInsets}
        statusBar={statusBar}
        userName={userName || ''}
      />
    );
  }

  if (screen === 'newWarehouseOrder') {
    return (
      <NewWarehouseOrderScreen
        items={inventoryItems}
        onSave={(order) => {
          setInventoryOrders(prev => [...prev, order]);
          setScreen('warehouse');
        }}
        onCancel={() => setScreen('warehouse')}
        safeAreaInsets={safeAreaInsets}
        statusBar={statusBar}
        userName={userName || ''}
      />
    );
  }

  if (screen === 'maintenance') {
    return (
      <MaintenanceScreen
        units={maintenanceUnits}
        onSelectUnit={(unitId) => {
          setSelectedMaintenanceUnitId(unitId);
          setScreen('maintenanceTasks');
        }}
        onBack={() => setScreen('hub')}
        safeAreaInsets={safeAreaInsets}
        statusBar={statusBar}
      />
    );
  }

  if (screen === 'maintenanceTasks') {
    const unit = maintenanceUnits.find(u => u.id === selectedMaintenanceUnitId);
    if (!unit) {
      setScreen('maintenance');
      return null;
    }
    return (
      <MaintenanceTasksScreen
        unit={unit}
        onSelectTask={(taskId) => {
          setSelectedMaintenanceTaskId(taskId);
          setScreen('maintenanceTaskDetail');
        }}
        onNewTask={() => setScreen('newMaintenanceTask')}
        onBack={() => setScreen('maintenance')}
        safeAreaInsets={safeAreaInsets}
        statusBar={statusBar}
      />
    );
  }

  if (screen === 'maintenanceTaskDetail') {
    const unit = maintenanceUnits.find(u => u.id === selectedMaintenanceUnitId);
    const task = unit?.tasks.find(t => t.id === selectedMaintenanceTaskId);
    if (!task || !unit) {
      setScreen('maintenanceTasks');
      return null;
    }
    return (
      <MaintenanceTaskDetailScreen
        unit={unit}
        task={task}
        onUpdateTask={(taskId, updates) => {
          setMaintenanceUnits(prev =>
            prev.map(u =>
              u.id === unit.id
                ? {
                    ...u,
                    tasks: u.tasks.map(t =>
                      t.id === taskId ? { ...t, ...updates } : t,
                    ),
                  }
                : u,
            ),
          );
        }}
        onBack={() => setScreen('maintenanceTasks')}
        safeAreaInsets={safeAreaInsets}
        statusBar={statusBar}
      />
    );
  }

  if (screen === 'newMaintenanceTask') {
    const unit = maintenanceUnits.find(u => u.id === selectedMaintenanceUnitId);
    if (!unit) {
      setScreen('maintenanceTasks');
      return null;
    }
    return (
      <NewMaintenanceTaskScreen
        unit={unit}
        onSave={(task) => {
          setMaintenanceUnits(prev =>
            prev.map(u =>
              u.id === unit.id ? { ...u, tasks: [...u.tasks, task] } : u,
            ),
          );
          setScreen('maintenanceTasks');
        }}
        onCancel={() => setScreen('maintenanceTasks')}
        safeAreaInsets={safeAreaInsets}
        statusBar={statusBar}
        userName={userName || ''}
      />
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { paddingTop: safeAreaInsets.top }]}
    >
      {statusBar}
      <View style={styles.ordersHeader}>
        <Pressable
          onPress={() => setScreen('hub')}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← חזרה</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.ordersPageHeader}>
          <Text style={styles.ordersPageTitle}>הזמנות</Text>
          <Text style={styles.ordersPageSubtitle}>
            שלום {userName}, ניהול הזמנות, תשלומים וסטטוסים
          </Text>
        </View>

        <View style={styles.summaryCardEnhanced}>
          <View style={styles.summaryCardHeader}>
            <Text style={styles.summaryTitleEnhanced}>סיכום מהיר</Text>
          </View>
          <View style={styles.summaryStatsRow}>
            <View style={styles.summaryStatItem}>
              <Text style={styles.summaryStatValue}>{totals.count}</Text>
              <Text style={styles.summaryStatLabel}>הזמנות</Text>
            </View>
            <View style={styles.summaryStatDivider} />
            <View style={styles.summaryStatItem}>
              <Text style={styles.summaryStatValue}>₪{totals.totalPaid.toLocaleString('he-IL')}</Text>
              <Text style={styles.summaryStatLabel}>שולם עד כה</Text>
            </View>
          </View>
          <View style={styles.summaryNoteContainer}>
            <Text style={styles.summaryNoteEnhanced}>
              יצוא לאקסל ודו״ח הוצאות יתווספו בהמשך
            </Text>
          </View>
        </View>

        {orders.length === 0 ? (
          <View style={styles.emptyOrdersState}>
            <Text style={styles.emptyOrdersText}>אין הזמנות כרגע</Text>
          </View>
        ) : (
          orders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              onUpdate={updateOrder}
              onEdit={id => {
                setSelectedOrderId(id);
                setScreen('orderEdit');
              }}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

type OrderCardProps = {
  order: Order;
  onUpdate: (
    id: string,
    changes: Partial<Pick<Order, 'status' | 'paidAmount' | 'paymentMethod'>>,
  ) => void;
  onEdit: (id: string) => void;
};

function OrderCard({ order, onEdit }: OrderCardProps) {
  const paidPercent = Math.min(
    100,
    order.totalAmount > 0
      ? Math.round((order.paidAmount / order.totalAmount) * 100)
      : 0,
  );

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'חדש':
        return { bg: '#fef3c7', border: '#fbbf24', text: '#92400e' };
      case 'באישור':
        return { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' };
      case 'שולם חלקית':
        return { bg: '#fce7f3', border: '#ec4899', text: '#9f1239' };
      case 'שולם':
        return { bg: '#d1fae5', border: '#10b981', text: '#065f46' };
      case 'בוטל':
        return { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' };
      default:
        return { bg: '#f3f4f6', border: '#9ca3af', text: '#374151' };
    }
  };

  const statusColors = getStatusColor(order.status);
  const remainingAmount = order.totalAmount - order.paidAmount;

  return (
    <View style={[styles.card, styles.orderCardEnhanced]}>
      {/* Header with Unit and Status */}
      <View style={styles.orderCardHeaderEnhanced}>
        <View style={styles.orderCardHeaderLeft}>
          <View style={styles.orderCardTitleContainer}>
            <Text style={styles.orderCardUnitTitle}>{order.unitNumber}</Text>
            <Text style={styles.orderCardId}>#{order.id}</Text>
          </View>
        </View>
        <View style={[styles.statusBadgeEnhanced, { backgroundColor: statusColors.bg, borderColor: statusColors.border }]}>
          <Text style={[styles.statusBadgeTextEnhanced, { color: statusColors.text }]}>
            {order.status}
          </Text>
        </View>
      </View>

      {/* Guest Info Section */}
      <View style={styles.orderInfoSection}>
        <View style={styles.orderInfoRow}>
          <View style={styles.orderInfoContent}>
            <Text style={styles.orderInfoLabel}>אורח</Text>
            <Text style={styles.orderInfoValue}>{order.guestName}</Text>
          </View>
          <View style={styles.orderInfoContent}>
            <Text style={styles.orderInfoLabel}>מספר אורחים</Text>
            <Text style={styles.orderInfoValue}>{order.guestsCount} אנשים</Text>
          </View>
        </View>

        {/* Dates */}
        <View style={styles.orderInfoRow}>
          <View style={styles.orderInfoContent}>
            <Text style={styles.orderInfoLabel}>תאריך הגעה</Text>
            <Text style={styles.orderInfoValue}>{order.arrivalDate}</Text>
          </View>
          <View style={styles.orderInfoContent}>
            <Text style={styles.orderInfoLabel}>תאריך יציאה</Text>
            <Text style={styles.orderInfoValue}>{order.departureDate}</Text>
          </View>
        </View>

        {/* Payment Info */}
        <View style={styles.orderPaymentSection}>
          <View style={styles.orderPaymentRow}>
            <View style={styles.orderPaymentItem}>
              <Text style={styles.orderPaymentLabel}>סכום כולל</Text>
              <Text style={styles.orderPaymentTotal}>₪{order.totalAmount.toLocaleString('he-IL')}</Text>
            </View>
            <View style={styles.orderPaymentItem}>
              <Text style={styles.orderPaymentLabel}>שולם</Text>
              <Text style={styles.orderPaymentPaid}>₪{order.paidAmount.toLocaleString('he-IL')}</Text>
            </View>
            {remainingAmount > 0 && (
              <View style={styles.orderPaymentItem}>
                <Text style={styles.orderPaymentLabel}>נותר</Text>
                <Text style={styles.orderPaymentRemaining}>₪{remainingAmount.toLocaleString('he-IL')}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.orderInfoRow}>
          <View style={styles.orderInfoContent}>
            <Text style={styles.orderInfoLabel}>אופן תשלום</Text>
            <Text style={styles.orderInfoValue}>{order.paymentMethod || 'לא צוין'}</Text>
          </View>
        </View>

        {/* Special Requests */}
        {order.specialRequests ? (
          <View style={styles.orderSpecialSection}>
            <View style={styles.orderSpecialContent}>
              <Text style={styles.orderSpecialLabel}>בקשות מיוחדות</Text>
              <Text style={styles.orderSpecialText}>{order.specialRequests}</Text>
            </View>
          </View>
        ) : null}

        {/* Internal Notes */}
        {order.internalNotes ? (
          <View style={styles.orderNotesSection}>
            <View style={styles.orderNotesContent}>
              <Text style={styles.orderNotesLabel}>הערות פנימיות</Text>
              <Text style={styles.orderNotesText}>{order.internalNotes}</Text>
            </View>
          </View>
        ) : null}
      </View>

      {/* Progress Bar */}
      <View style={styles.progressWrapEnhanced}>
        <View style={styles.progressHeaderEnhanced}>
          <Text style={styles.progressLabelEnhanced}>התקדמות תשלום</Text>
          <Text style={styles.progressValueEnhanced}>{paidPercent}%</Text>
        </View>
        <View style={styles.progressBarEnhanced}>
          <View
            style={[
              styles.progressFillEnhanced,
              { width: `${paidPercent}%`, backgroundColor: paidPercent === 100 ? '#10b981' : paidPercent >= 50 ? '#3b82f6' : '#f59e0b' },
            ]}
          />
        </View>
        <View style={styles.progressFooter}>
          <Text style={styles.progressFooterText}>
            ₪{order.paidAmount.toLocaleString('he-IL')} מתוך ₪{order.totalAmount.toLocaleString('he-IL')}
          </Text>
        </View>
      </View>

      {/* Edit Button */}
      <View style={styles.editActionsEnhanced}>
        <Pressable
          style={styles.editButtonEnhanced}
          onPress={() => onEdit(order.id)}
        >
          <Text style={styles.editButtonText}>עריכת הזמנה</Text>
        </Pressable>
      </View>
    </View>
  );
}

type OrderEditProps = {
  order: Order;
  onSave: (
    id: string,
    changes: Partial<
      Pick<
        Order,
        | 'status'
        | 'paidAmount'
        | 'paymentMethod'
        | 'guestName'
        | 'unitNumber'
        | 'arrivalDate'
        | 'departureDate'
        | 'guestsCount'
        | 'specialRequests'
        | 'internalNotes'
        | 'totalAmount'
      >
    >,
  ) => void;
  onCancel: () => void;
};

function OrderEditScreen({ order, onSave, onCancel }: OrderEditProps) {
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [paid, setPaid] = useState(order.paidAmount.toString());
  const [method, setMethod] = useState(order.paymentMethod);
  const [total, setTotal] = useState(order.totalAmount.toString());
  const [guestName, setGuestName] = useState(order.guestName);
  const [unitNumber, setUnitNumber] = useState(order.unitNumber);
  const [arrivalDate, setArrivalDate] = useState(order.arrivalDate);
  const [departureDate, setDepartureDate] = useState(order.departureDate);
  const [guestsCount, setGuestsCount] = useState(order.guestsCount.toString());
  const [specialRequests, setSpecialRequests] = useState(
    order.specialRequests || '',
  );
  const [internalNotes, setInternalNotes] = useState(order.internalNotes || '');
  const [addPayment, setAddPayment] = useState('');
  const [statusOpen, setStatusOpen] = useState(false);
  const [methodOpen, setMethodOpen] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);

  React.useEffect(() => {
    setStatus(order.status);
    setPaid(order.paidAmount.toString());
    setMethod(order.paymentMethod);
    setTotal(order.totalAmount.toString());
    setGuestName(order.guestName);
    setUnitNumber(order.unitNumber);
    setArrivalDate(order.arrivalDate);
    setDepartureDate(order.departureDate);
    setGuestsCount(order.guestsCount.toString());
    setSpecialRequests(order.specialRequests || '');
    setInternalNotes(order.internalNotes || '');
    setAddPayment('');
    setStatusOpen(false);
    setMethodOpen(false);
  }, [order]);

  const paidNumber = Number(paid.replace(/,/g, '')) || 0;
  const totalNumber = Number(total.replace(/,/g, '')) || 0;
  const paidPercent = Math.min(
    100,
    totalNumber > 0 ? Math.round((paidNumber / totalNumber) * 100) : 0,
  );

  const addPaymentAmount = () => {
    const trimmed = addPayment.trim();
    if (!trimmed) {
      return true;
    }
    const addVal = Number(trimmed.replace(/,/g, ''));
    if (Number.isNaN(addVal) || addVal <= 0) {
      Alert.alert('שגיאה', 'נא להזין סכום הוספה תקין וחיובי');
      return false;
    }
    const next = paidNumber + addVal;
    setPaid(next.toString());
    setAddPayment('');
    return true;
  };

  const confirmPaymentModal = () => {
    if (Number.isNaN(totalNumber) || totalNumber <= 0) {
      Alert.alert('שגיאה', 'סכום מלא חייב להיות חיובי');
      return;
    }
    if (paidNumber < 0) {
      Alert.alert('שגיאה', 'סכום ששולם חייב להיות חיובי');
      return;
    }
    if (!addPaymentAmount()) return;
    setShowAddPayment(false);
  };

  const saveEdit = () => {
    if (!guestName.trim() || !unitNumber.trim()) {
      Alert.alert('שגיאה', 'יש למלא שם אורח ומספר יחידה');
      return;
    }
    if (Number.isNaN(totalNumber) || totalNumber <= 0) {
      Alert.alert('שגיאה', 'סכום מלא חייב להיות חיובי');
      return;
    }
    if (paidNumber < 0) {
      Alert.alert('שגיאה', 'סכום ששולם חייב להיות חיובי');
      return;
    }
    onSave(order.id, {
      status,
      paidAmount: paidNumber,
      paymentMethod: method || 'לא צוין',
      totalAmount: totalNumber,
      guestName: guestName.trim(),
      unitNumber: unitNumber.trim(),
      arrivalDate: arrivalDate.trim(),
      departureDate: departureDate.trim(),
      guestsCount: Number(guestsCount) || order.guestsCount,
      specialRequests: specialRequests.trim(),
      internalNotes: internalNotes.trim(),
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>עריכת הזמנה</Text>
        <Text style={styles.subtitle}>
          שינוי מלא של פרטי הזמנה והוספת תשלום נוסף
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>שם אורח</Text>
          <TextInput
            style={styles.input}
            value={guestName}
            onChangeText={setGuestName}
            placeholder="שם אורח"
            textAlign="right"
          />

          <Text style={styles.label}>מספר יחידה</Text>
          <TextInput
            style={styles.input}
            value={unitNumber}
            onChangeText={setUnitNumber}
            placeholder="יחידה 1"
            textAlign="right"
          />

          <View style={styles.fieldRow}>
            <View style={[styles.field, styles.fieldHalf]}>
              <Text style={styles.label}>תאריך הגעה</Text>
              <TextInput
                style={styles.input}
                value={arrivalDate}
                onChangeText={setArrivalDate}
                placeholder="2025-12-20"
                textAlign="right"
              />
            </View>
            <View style={[styles.field, styles.fieldHalf]}>
              <Text style={styles.label}>תאריך עזיבה</Text>
              <TextInput
                style={styles.input}
                value={departureDate}
                onChangeText={setDepartureDate}
                placeholder="2025-12-23"
                textAlign="right"
              />
            </View>
          </View>

          <View style={styles.fieldRow}>
            <View style={[styles.field, styles.fieldHalf]}>
              <Text style={styles.label}>מספר אורחים</Text>
              <TextInput
                style={styles.input}
                value={guestsCount}
                onChangeText={setGuestsCount}
                keyboardType="numeric"
                placeholder="0"
                textAlign="right"
              />
            </View>
            <View style={[styles.field, styles.fieldHalf]}>
              <Text style={styles.label}>סטטוס הזמנה</Text>
              <Pressable
                onPress={() => setStatusOpen(o => !o)}
                style={styles.select}
              >
                <Text style={styles.selectValue}>{status}</Text>
                <Text style={styles.selectCaret}>▾</Text>
              </Pressable>
              {statusOpen ? (
                <View style={styles.selectList}>
                  {statusOptions.map(option => (
                    <Pressable
                      key={option}
                      style={[
                        styles.selectItem,
                        option === status && styles.selectItemActive,
                      ]}
                      onPress={() => {
                        setStatus(option);
                        setStatusOpen(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.selectItemText,
                          option === status && styles.selectItemTextActive,
                        ]}
                      >
                        {option}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.fieldRow}>
            <View style={[styles.field, styles.fieldHalf, { justifyContent: 'flex-end' }]}>
              <Pressable
                onPress={() => setShowAddPayment(true)}
                style={({ pressed }) => [
                  styles.addPaymentTrigger,
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Text style={styles.addPaymentText}>הוסף / עדכון תשלום</Text>
              </Pressable>
            </View>
          </View>

          <Text style={styles.label}>בקשות מיוחדות</Text>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
            value={specialRequests}
            onChangeText={setSpecialRequests}
            multiline
            placeholder="לדוגמה: בקשה ללול תינוק"
            textAlign="right"
          />

          <Text style={styles.label}>הערות פנימיות</Text>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
            value={internalNotes}
            onChangeText={setInternalNotes}
            multiline
            placeholder="הערות לצוות"
            textAlign="right"
          />

          <View style={styles.editActions}>
            <PrimaryButton label="שמירה" onPress={saveEdit} />
            <OutlineButton label="ביטול" onPress={onCancel} />
          </View>
        </View>
      </ScrollView>

      <Modal transparent visible={showAddPayment} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>הוסף תשלום</Text>
            <Text style={styles.label}>סכום מלא (₪)</Text>
            <TextInput
              style={styles.input}
              value={total}
              onChangeText={setTotal}
              keyboardType="numeric"
              placeholder="0"
              textAlign="right"
            />
            <Text style={styles.label}>סכום ששולם (₪)</Text>
            <TextInput
              style={styles.input}
              value={paid}
              onChangeText={setPaid}
              keyboardType="numeric"
              placeholder="0"
              textAlign="right"
            />
            <Text style={styles.label}>אופן תשלום</Text>
            <Pressable
              onPress={() => setMethodOpen(o => !o)}
              style={styles.select}
            >
              <Text style={styles.selectValue}>{method || 'בחרו אופן תשלום'}</Text>
              <Text style={styles.selectCaret}>▾</Text>
            </Pressable>
            {methodOpen ? (
              <View style={styles.selectList}>
                {paymentOptions.map(option => (
                  <Pressable
                    key={option}
                    style={[
                      styles.selectItem,
                      option === method && styles.selectItemActive,
                    ]}
                    onPress={() => {
                      setMethod(option);
                      setMethodOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.selectItemText,
                        option === method && styles.selectItemTextActive,
                      ]}
                    >
                      {option}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <Text style={styles.label}>הוסף תשלום נוסף (₪)</Text>
            <View style={styles.addPaymentRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={addPayment}
                onChangeText={setAddPayment}
                keyboardType="numeric"
                placeholder="0"
                textAlign="right"
              />
              <Pressable
                onPress={addPaymentAmount}
                style={({ pressed }) => [
                  styles.addPaymentTrigger,
                  { minWidth: 90, paddingVertical: 10 },
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Text style={styles.addPaymentText}>הוסף</Text>
              </Pressable>
            </View>

            <View style={styles.progressWrap}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>
                  סכום מלא: ₪{totalNumber.toLocaleString('he-IL')}
                </Text>
                <Text style={styles.progressValue}>שולם {paidPercent}%</Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${paidPercent}%` },
                  ]}
                />
              </View>
            </View>

            <View style={styles.modalButtons}>
              <Pressable
                onPress={confirmPaymentModal}
                style={({ pressed }) => [
                  styles.modalButton,
                  { backgroundColor: '#2563eb' },
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Text style={styles.modalButtonText}>אישור</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setShowAddPayment(false);
                  setAddPayment('');
                }}
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.modalButtonGhost,
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Text style={styles.modalButtonGhostText}>ביטול</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  style?: object;
};

type OptionCardProps = {
  title: string;
  icon: string;
  accent: string;
  details: string[];
  cta?: string;
  onPress?: () => void;
};

type ExitInspectionsProps = {
  missions: InspectionMission[];
  onUpdateMission: (id: string, updates: Partial<InspectionMission>) => void;
  onBack: () => void;
  safeAreaInsets: { top: number };
  statusBar: React.ReactElement;
};

function ExitInspectionsScreen({
  missions,
  onUpdateMission,
  onBack,
  safeAreaInsets,
  statusBar,
}: ExitInspectionsProps) {

  const toggleTask = (missionId: string, taskId: string) => {
    const mission = missions.find(m => m.id === missionId);
    if (!mission) return;
    
    const updatedTasks = mission.tasks.map(t =>
      t.id === taskId ? { ...t, completed: !t.completed } : t,
    );
    
    const completedCount = updatedTasks.filter(t => t.completed).length;
    const newStatus: InspectionStatus =
      completedCount === 0
        ? 'צריך ביקורת'
        : completedCount === updatedTasks.length
          ? 'הושלם'
          : 'בביצוע';

    onUpdateMission(missionId, {
      tasks: updatedTasks,
      status: newStatus,
    });
  };


  return (
    <SafeAreaView
      style={[styles.container, { paddingTop: safeAreaInsets.top }]}
    >
      {statusBar}
      <View style={styles.ordersHeader}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← חזרה</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.inspectionsHeader}>
          <View>
            <Text style={styles.title}>ביקורת יציאת אורח</Text>
            <Text style={styles.subtitle}>
              ניהול משימות ניקיון וביקורת לאחר עזיבת אורחים
            </Text>
          </View>
          <View style={styles.statsBadge}>
            <Text style={styles.statsBadgeText}>
              {missions.length} משימות
            </Text>
          </View>
        </View>

        {missions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>אין משימות ביקורת כרגע</Text>
          </View>
        ) : (
          <View style={styles.missionsList}>
            {missions.map(mission => (
                <InspectionMissionCard
                  key={mission.id}
                  mission={mission}
                  onToggleTask={toggleTask}
                />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

type InspectionMissionCardProps = {
  mission: InspectionMission;
  onToggleTask: (missionId: string, taskId: string) => void;
};

function InspectionMissionCard({
  mission,
  onToggleTask,
}: InspectionMissionCardProps) {
  const [expanded, setExpanded] = useState(false);

  const completedTasks = mission.tasks.filter(t => t.completed).length;
  const totalTasks = mission.tasks.length;
  const progressPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const getDisplayStatus = () => {
    if (completedTasks === totalTasks && totalTasks > 0) {
      return 'ביקורת הושלמה';
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const departureDate = new Date(mission.departureDate);
    departureDate.setHours(0, 0, 0, 0);
    
    if (departureDate > today) {
      return 'מועד הביקורת טרם הגיע';
    }
    
    return 'מחכה לביקורת';
  };

  const getStatusColor = (statusText: string) => {
    if (statusText === 'ביקורת הושלמה') {
      return '#22c55e';
    }
    if (statusText === 'מחכה לביקורת') {
      return '#f59e0b';
    }
    if (statusText === 'מועד הביקורת טרם הגיע') {
      return '#64748b';
    }
    return '#64748b';
  };

  const displayStatus = getDisplayStatus();
  const statusColor = getStatusColor(displayStatus);

  return (
    <Pressable
      onPress={() => setExpanded(!expanded)}
      style={({ pressed }) => [
        styles.card,
        styles.inspectionCard,
        pressed && { opacity: 0.95 },
      ]}
    >
      <View style={styles.inspectionHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{mission.unitNumber}</Text>
          <Text style={styles.cardLine}>אורח: {mission.guestName}</Text>
          <Text style={styles.cardLine}>תאריך ביקורת: {mission.departureDate}</Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>סטטוס:</Text>
            <View
              style={[
                styles.statusDisplayBadge,
                { backgroundColor: statusColor + '22', borderColor: statusColor + '55' },
              ]}
            >
              <Text style={[styles.statusDisplayText, { color: statusColor }]}>
                {displayStatus}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {expanded && (
        <>
          <View style={styles.inspectionDivider} />

          <View style={styles.progressWrap}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>
                משימות: {completedTasks} / {totalTasks}
              </Text>
              <Text style={styles.progressValue}>
                {Math.round(progressPercent)}%
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progressPercent}%` },
                ]}
              />
            </View>
          </View>

          <View style={styles.tasksList}>
            <Text style={styles.tasksTitle}>רשימת משימות:</Text>
            {mission.tasks.map(task => (
              <Pressable
                key={task.id}
                onPress={(e) => {
                  e.stopPropagation();
                  onToggleTask(mission.id, task.id);
                }}
                style={styles.taskItem}
              >
                <View
                  style={[
                    styles.taskCheckbox,
                    task.completed && styles.taskCheckboxCompleted,
                  ]}
                >
                  {task.completed && <Text style={styles.taskCheckmark}>✓</Text>}
                </View>
                <Text
                  style={[
                    styles.taskText,
                    task.completed && styles.taskTextCompleted,
                  ]}
                >
                  {task.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
    </Pressable>
  );
}

function PrimaryButton({ label, onPress, style }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        pressed && { opacity: 0.9, transform: [{ translateY: 1 }] },
        style,
      ]}
    >
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function OutlineButton({ label, onPress, style }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.outlineButton,
        pressed && { opacity: 0.9, transform: [{ translateY: 1 }] },
        style,
      ]}
    >
      <Text style={styles.outlineButtonText}>{label}</Text>
    </Pressable>
  );
}

type WarehouseScreenProps = {
  items: InventoryItem[];
  orders: InventoryOrder[];
  selectedUnit: string;
  onSelectUnit: (unit: string) => void;
  onAddOrder: (order: InventoryOrder) => void;
  onUpdateOrder: (id: string, updates: Partial<InventoryOrder>) => void;
  onBack: () => void;
  onNewOrder: () => void;
  safeAreaInsets: { top: number };
  statusBar: React.ReactElement;
  userName: string;
};

type NewWarehouseOrderScreenProps = {
  items: InventoryItem[];
  onSave: (order: InventoryOrder) => void;
  onCancel: () => void;
  safeAreaInsets: { top: number };
  statusBar: React.ReactElement;
  userName: string;
};

function WarehouseScreen({
  items,
  orders,
  selectedUnit,
  onSelectUnit,
  onAddOrder,
  onUpdateOrder,
  onBack,
  onNewOrder,
  safeAreaInsets,
  statusBar,
  userName,
}: WarehouseScreenProps) {

  const handleToggleOrder = (orderId: string) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
      setEditingOrderItems([]);
    } else {
      setExpandedOrderId(orderId);
      const order = orders.find(o => o.id === orderId);
      if (order) {
        setEditingOrderItems([{ itemId: order.itemId, quantity: order.quantity }]);
      }
    }
  };

  const handleAddItemToOrder = (itemId: string, quantity: number) => {
    const existingIndex = editingOrderItems.findIndex(i => i.itemId === itemId);
    if (existingIndex >= 0) {
      const updated = [...editingOrderItems];
      updated[existingIndex].quantity += quantity;
      setEditingOrderItems(updated);
    } else {
      setEditingOrderItems([...editingOrderItems, { itemId, quantity }]);
    }
  };

  const handleSaveOrder = (orderId: string) => {
    if (editingOrderItems.length === 0) {
      Alert.alert('שגיאה', 'יש להוסיף לפחות פריט אחד להזמנה');
      return;
    }

    // Update the first item in the order (simplified - in real app would handle multiple items)
    const firstItem = editingOrderItems[0];
    const item = items.find(i => i.id === firstItem.itemId);
    if (item) {
      onUpdateOrder(orderId, {
        itemId: firstItem.itemId,
        itemName: item.name,
        quantity: firstItem.quantity,
        unit: item.unit,
      });
    }
    setExpandedOrderId(null);
    setEditingOrderItems([]);
  };


  const getStatusColor = (status: InventoryOrder['status']) => {
    switch (status) {
      case 'ממתין לאישור':
        return '#f59e0b';
      case 'מאושר':
        return '#3b82f6';
      case 'בהזמנה':
        return '#8b5cf6';
      case 'התקבל':
        return '#22c55e';
      case 'בוטל':
        return '#ef4444';
      default:
        return '#64748b';
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { paddingTop: safeAreaInsets.top }]}
    >
      {statusBar}
      <View style={styles.ordersHeader}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← חזרה</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.warehouseHeader}>
          <View>
            <Text style={styles.title}>מחסן</Text>
            <Text style={styles.subtitle}>
              הזמנות פנימיות למלאי וצפייה בסטטוס
            </Text>
          </View>
        </View>

        <View style={styles.ordersList}>
          <View style={styles.ordersHeaderRow}>
            <Text style={styles.sectionTitle}>הזמנות פנימיות</Text>
            <Pressable
              onPress={onNewOrder}
              style={styles.addOrderButton}
            >
              <Text style={styles.addOrderButtonText}>+ הזמנה חדשה</Text>
            </Pressable>
          </View>

          {orders.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>אין הזמנות כרגע</Text>
            </View>
          ) : (
            orders.map(order => (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderCardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.orderItemName}>{order.itemName}</Text>
                    <Text style={styles.orderDetails}>
                      כמות: {order.quantity} {order.unit}
                    </Text>
                    {order.orderedBy && (
                      <Text style={styles.orderDetails}>
                        הוזמן על ידי: {order.orderedBy}
                      </Text>
                    )}
                    <Text style={styles.orderDetails}>
                      תאריך הזמנה: {order.orderDate}
                    </Text>
                    {order.deliveryDate && (
                      <Text style={styles.orderDetails}>
                        תאריך אספקה: {order.deliveryDate}
                      </Text>
                    )}
                  </View>
                  <View
                    style={[
                      styles.orderStatusBadge,
                      { backgroundColor: getStatusColor(order.status) + '22' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.orderStatusText,
                        { color: getStatusColor(order.status) },
                      ]}
                    >
                      {order.status}
                    </Text>
                  </View>
                </View>
                <View style={styles.orderTypeBadge}>
                  <Text style={styles.orderTypeText}>{order.orderType}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type ItemTableRowProps = {
  item: InventoryItem;
  currentQuantity?: number;
  onAdd: (itemId: string, quantity: number) => void;
};

function NewWarehouseOrderScreen({
  items,
  onSave,
  onCancel,
  safeAreaInsets,
  statusBar,
  userName,
}: NewWarehouseOrderScreenProps) {
  const [selectedItems, setSelectedItems] = useState<{ itemId: string; quantity: number }[]>([]);
  const [orderType, setOrderType] = useState<'הזמנת עובד' | 'הזמנה כללית'>('הזמנה כללית');
  const [deliveryDate, setDeliveryDate] = useState('');

  const handleAddItem = (itemId: string, quantity: number) => {
    const existingIndex = selectedItems.findIndex(i => i.itemId === itemId);
    if (existingIndex >= 0) {
      const updated = [...selectedItems];
      updated[existingIndex].quantity += quantity;
      setSelectedItems(updated);
    } else {
      setSelectedItems([...selectedItems, { itemId, quantity }]);
    }
  };

  const handleRemoveItem = (itemId: string) => {
    setSelectedItems(selectedItems.filter(i => i.itemId !== itemId));
  };

  const handleSave = () => {
    if (selectedItems.length === 0) {
      Alert.alert('שגיאה', 'יש להוסיף לפחות פריט אחד להזמנה');
      return;
    }

    // Create order with first item (simplified - in real app would handle multiple items)
    const firstItem = selectedItems[0];
    const item = items.find(i => i.id === firstItem.itemId);
    if (!item) return;

    const newOrder: InventoryOrder = {
      id: `ORD-INV-${Date.now()}`,
      itemId: item.id,
      itemName: item.name,
      quantity: firstItem.quantity,
      unit: item.unit,
      orderDate: new Date().toISOString().split('T')[0],
      deliveryDate: deliveryDate || undefined,
      status: 'ממתין לאישור',
      orderType: orderType,
      orderedBy: orderType === 'הזמנת עובד' ? userName : undefined,
    };

    onSave(newOrder);
  };

  return (
    <SafeAreaView
      style={[styles.container, { paddingTop: safeAreaInsets.top }]}
    >
      {statusBar}
      <View style={styles.ordersHeader}>
        <Pressable onPress={onCancel} style={styles.backButton}>
          <Text style={styles.backButtonText}>← חזרה</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.warehouseHeader}>
          <View>
            <Text style={styles.title}>הזמנה חדשה</Text>
            <Text style={styles.subtitle}>
              בחרו פריטים מהמלאי והוסיפו להזמנה
            </Text>
          </View>
        </View>

        <View style={styles.itemsTableSection}>
          <Text style={styles.sectionTitle}>רשימת פריטי מלאי</Text>
          <View style={styles.itemsTable}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 2 }]}>מוצר</Text>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>כמות</Text>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>פעולה</Text>
            </View>
            {items.map(item => {
              const selectedItem = selectedItems.find(si => si.itemId === item.id);
              const currentQuantity = selectedItem ? selectedItem.quantity : 0;
              return (
                <ItemTableRow
                  key={item.id}
                  item={item}
                  currentQuantity={currentQuantity}
                  onAdd={handleAddItem}
                />
              );
            })}
          </View>
        </View>

        {selectedItems.length > 0 && (
          <View style={styles.selectedItemsSummary}>
            <Text style={styles.selectedItemsTitle}>פריטים נבחרים:</Text>
            {selectedItems.map((si, idx) => {
              const item = items.find(i => i.id === si.itemId);
              return item ? (
                <View key={idx} style={styles.selectedItemRow}>
                  <Text style={styles.selectedItemText}>
                    {item.name}: {si.quantity} {item.unit}
                  </Text>
                  <Pressable
                    onPress={() => handleRemoveItem(si.itemId)}
                    style={styles.removeItemButton}
                  >
                    <Text style={styles.removeItemButtonText}>×</Text>
                  </Pressable>
                </View>
              ) : null;
            })}
          </View>
        )}

        <View style={styles.orderDetailsSection}>
          <Text style={styles.sectionTitle}>פרטי הזמנה</Text>
          
          <View style={styles.field}>
            <Text style={styles.label}>סוג הזמנה</Text>
            <Pressable
              onPress={() => {
                setOrderType(
                  orderType === 'הזמנה כללית' ? 'הזמנת עובד' : 'הזמנה כללית',
                );
              }}
              style={styles.select}
            >
              <Text style={styles.selectValue}>{orderType}</Text>
              <Text style={styles.selectCaret}>▾</Text>
            </Pressable>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>תאריך אספקה (אופציונלי)</Text>
            <TextInput
              style={styles.input}
              value={deliveryDate}
              onChangeText={setDeliveryDate}
              placeholder="YYYY-MM-DD"
              textAlign="right"
            />
          </View>
        </View>

        <View style={styles.orderActions}>
          <Pressable
            onPress={handleSave}
            style={styles.saveOrderButton}
          >
            <Text style={styles.saveOrderButtonText}>צור הזמנה</Text>
          </Pressable>
          <Pressable
            onPress={onCancel}
            style={styles.cancelOrderButton}
          >
            <Text style={styles.cancelOrderButtonText}>ביטול</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ItemTableRow({ item, currentQuantity = 0, onAdd }: ItemTableRowProps) {
  const [quantity, setQuantity] = useState('1');

  const handleAdd = () => {
    const qty = Number(quantity);
    if (qty > 0) {
      onAdd(item.id, qty);
      setQuantity('1');
    }
  };

  return (
    <View style={styles.tableRow}>
      <View style={[styles.tableCell, { flex: 2 }]}>
        <Text style={styles.tableCellText}>{item.name}</Text>
        <Text style={styles.tableCellSubtext}>{item.category} • {item.unit}</Text>
        {currentQuantity > 0 && (
          <Text style={styles.currentQuantityText}>
            נבחר: {currentQuantity} {item.unit}
          </Text>
        )}
      </View>
      <View style={[styles.tableCell, { flex: 1 }]}>
        <TextInput
          style={styles.quantityInput}
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="numeric"
          placeholder="1"
          textAlign="center"
        />
      </View>
      <View style={[styles.tableCell, { flex: 1 }]}>
        <Pressable onPress={handleAdd} style={styles.tableOrderButton}>
          <Text style={styles.tableOrderButtonText}>הוסף</Text>
        </Pressable>
      </View>
    </View>
  );
}

type MaintenanceScreenProps = {
  units: MaintenanceUnit[];
  onSelectUnit: (unitId: string) => void;
  onBack: () => void;
  safeAreaInsets: { top: number };
  statusBar: React.ReactElement;
};

type MaintenanceTasksScreenProps = {
  unit: MaintenanceUnit;
  onSelectTask: (taskId: string) => void;
  onNewTask: () => void;
  onBack: () => void;
  safeAreaInsets: { top: number };
  statusBar: React.ReactElement;
};

type MaintenanceTaskDetailScreenProps = {
  unit: MaintenanceUnit;
  task: MaintenanceTask;
  onUpdateTask: (taskId: string, updates: Partial<MaintenanceTask>) => void;
  onBack: () => void;
  safeAreaInsets: { top: number };
  statusBar: React.ReactElement;
};

type NewMaintenanceTaskScreenProps = {
  unit: MaintenanceUnit;
  onSave: (task: MaintenanceTask) => void;
  onCancel: () => void;
  safeAreaInsets: { top: number };
  statusBar: React.ReactElement;
  userName: string;
};

function MaintenanceScreen({
  units,
  onSelectUnit,
  onBack,
  safeAreaInsets,
  statusBar,
}: MaintenanceScreenProps) {
  const getStatusColor = (status: MaintenanceStatus) => {
    switch (status) {
      case 'פתוח':
        return '#f59e0b';
      case 'בטיפול':
        return '#3b82f6';
      case 'סגור':
        return '#22c55e';
      default:
        return '#64748b';
    }
  };

  const getUnitStats = (unit: MaintenanceUnit) => {
    const open = unit.tasks.filter(t => t.status === 'פתוח').length;
    const inProgress = unit.tasks.filter(t => t.status === 'בטיפול').length;
    const closed = unit.tasks.filter(t => t.status === 'סגור').length;
    return { open, inProgress, closed, total: unit.tasks.length };
  };

  return (
    <SafeAreaView
      style={[styles.container, { paddingTop: safeAreaInsets.top }]}
    >
      {statusBar}
      <View style={styles.ordersHeader}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← חזרה</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.warehouseHeader}>
          <View>
            <Text style={styles.title}>תחזוקה</Text>
            <Text style={styles.subtitle}>
              ניהול משימות תחזוקה ליחידות נופש
            </Text>
          </View>
        </View>

        <View style={styles.unitsGrid}>
          {units.map(unit => {
            const stats = getUnitStats(unit);
            return (
              <Pressable
                key={unit.id}
                onPress={() => onSelectUnit(unit.id)}
                style={styles.unitCard}
              >
                <View style={styles.unitCardHeader}>
                  <View style={styles.unitIcon}>
                    <Text style={styles.unitIconText}>
                      {unit.type === 'יחידה' ? '🏠' : '🏡'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.unitCardName}>{unit.name}</Text>
                    <Text style={styles.unitCardType}>{unit.type}</Text>
                  </View>
                </View>
                <View style={styles.unitStats}>
                  <View style={styles.unitStatItem}>
                    <Text style={styles.unitStatValue}>{stats.total}</Text>
                    <Text style={styles.unitStatLabel}>סה״כ משימות</Text>
                  </View>
                  <View style={styles.unitStatItem}>
                    <Text style={[styles.unitStatValue, { color: '#f59e0b' }]}>
                      {stats.open}
                    </Text>
                    <Text style={styles.unitStatLabel}>פתוחות</Text>
                  </View>
                  <View style={styles.unitStatItem}>
                    <Text style={[styles.unitStatValue, { color: '#3b82f6' }]}>
                      {stats.inProgress}
                    </Text>
                    <Text style={styles.unitStatLabel}>בטיפול</Text>
                  </View>
                  <View style={styles.unitStatItem}>
                    <Text style={[styles.unitStatValue, { color: '#22c55e' }]}>
                      {stats.closed}
                    </Text>
                    <Text style={styles.unitStatLabel}>סגורות</Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MaintenanceTasksScreen({
  unit,
  onSelectTask,
  onNewTask,
  onBack,
  safeAreaInsets,
  statusBar,
}: MaintenanceTasksScreenProps) {
  const getStatusColor = (status: MaintenanceStatus) => {
    switch (status) {
      case 'פתוח':
        return '#f59e0b';
      case 'בטיפול':
        return '#3b82f6';
      case 'סגור':
        return '#22c55e';
      default:
        return '#64748b';
    }
  };

  const getPriorityColor = (priority: MaintenancePriority) => {
    switch (priority) {
      case 'דחוף':
        return '#ef4444';
      case 'גבוה':
        return '#f59e0b';
      case 'בינוני':
        return '#3b82f6';
      case 'נמוך':
        return '#64748b';
      default:
        return '#64748b';
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { paddingTop: safeAreaInsets.top }]}
    >
      {statusBar}
      <View style={styles.ordersHeader}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← חזרה</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.warehouseHeader}>
          <View>
            <Text style={styles.title}>{unit.name}</Text>
            <Text style={styles.subtitle}>
              משימות תחזוקה - {unit.tasks.length} משימות
            </Text>
          </View>
        </View>

        <View style={styles.ordersHeaderRow}>
          <Text style={styles.sectionTitle}>משימות תחזוקה</Text>
          <Pressable onPress={onNewTask} style={styles.addOrderButton}>
            <Text style={styles.addOrderButtonText}>+ משימה חדשה</Text>
          </Pressable>
        </View>

        {unit.tasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>אין משימות תחזוקה ליחידה זו</Text>
          </View>
        ) : (
          unit.tasks.map(task => (
            <Pressable
              key={task.id}
              onPress={() => onSelectTask(task.id)}
              style={styles.taskCard}
            >
              <View style={styles.taskCardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.taskCardTitle}>{task.title}</Text>
                  <Text style={styles.taskCardDescription}>{task.description}</Text>
                  <View style={styles.taskCardMeta}>
                    <Text style={styles.taskCardMetaText}>קטגוריה: {task.category}</Text>
                    <Text style={styles.taskCardMetaText}>•</Text>
                    <Text style={styles.taskCardMetaText}>
                      תאריך: {task.createdDate}
                    </Text>
                  </View>
                  {task.assignedTo && (
                    <Text style={styles.taskCardAssigned}>
                      מוקצה ל: {task.assignedTo}
                    </Text>
                  )}
                </View>
                <View style={styles.taskCardBadges}>
                  <View
                    style={[
                      styles.taskStatusBadge,
                      { backgroundColor: getStatusColor(task.status) + '22' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.taskStatusText,
                        { color: getStatusColor(task.status) },
                      ]}
                    >
                      {task.status}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.taskPriorityBadge,
                      { backgroundColor: getPriorityColor(task.priority) + '22' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.taskPriorityText,
                        { color: getPriorityColor(task.priority) },
                      ]}
                    >
                      {task.priority}
                    </Text>
                  </View>
                </View>
              </View>
              {task.imageUri && (
                <View style={styles.taskImageIndicator}>
                  <Text style={styles.taskImageIndicatorText}>📷 תמונה מצורפת</Text>
                </View>
              )}
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MaintenanceTaskDetailScreen({
  unit,
  task,
  onUpdateTask,
  onBack,
  safeAreaInsets,
  statusBar,
}: MaintenanceTaskDetailScreenProps) {
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeModalImageUri, setCloseModalImageUri] = useState<string | undefined>(undefined);

  const handleOpenCloseModal = () => {
    setCloseModalImageUri(undefined);
    setShowCloseModal(true);
  };

  const handleCloseModalImageSelect = () => {
    Alert.alert(
      'העלאת תמונה',
      'בחרו תמונה מהגלריה',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'בחר תמונה',
          onPress: () => {
            const mockImageUri = `file:///close-image-${Date.now()}.jpg`;
            setCloseModalImageUri(mockImageUri);
          },
        },
      ],
    );
  };

  const handleConfirmClose = () => {
    if (!closeModalImageUri) {
      Alert.alert('שגיאה', 'יש להעלות תמונה לפני סגירת המשימה');
      return;
    }
    onUpdateTask(task.id, { status: 'סגור', imageUri: closeModalImageUri });
    Alert.alert('הצלחה', 'המשימה נסגרה בהצלחה');
    setShowCloseModal(false);
    onBack();
  };

  const getStatusColor = (status: MaintenanceStatus) => {
    switch (status) {
      case 'פתוח':
        return '#f59e0b';
      case 'בטיפול':
        return '#3b82f6';
      case 'סגור':
        return '#22c55e';
      default:
        return '#64748b';
    }
  };

  const getPriorityColor = (priority: MaintenancePriority) => {
    switch (priority) {
      case 'דחוף':
        return '#ef4444';
      case 'גבוה':
        return '#f59e0b';
      case 'בינוני':
        return '#3b82f6';
      case 'נמוך':
        return '#64748b';
      default:
        return '#64748b';
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { paddingTop: safeAreaInsets.top }]}
    >
      {statusBar}
      <View style={styles.ordersHeader}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← חזרה</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.taskDetailCard}>
          <View style={styles.taskDetailHeader}>
            <Text style={styles.taskDetailTitle}>{task.title}</Text>
            <View style={styles.taskDetailBadges}>
              <View
                style={[
                  styles.taskStatusBadge,
                  { backgroundColor: getStatusColor(task.status) + '22' },
                ]}
              >
                <Text
                  style={[
                    styles.taskStatusText,
                    { color: getStatusColor(task.status) },
                  ]}
                >
                  {task.status}
                </Text>
              </View>
              <View
                style={[
                  styles.taskPriorityBadge,
                  { backgroundColor: getPriorityColor(task.priority) + '22' },
                ]}
              >
                <Text
                  style={[
                    styles.taskPriorityText,
                    { color: getPriorityColor(task.priority) },
                  ]}
                >
                  {task.priority}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.taskDetailSection}>
            <Text style={styles.taskDetailLabel}>יחידה:</Text>
            <Text style={styles.taskDetailValue}>{unit.name}</Text>
          </View>

          <View style={styles.taskDetailSection}>
            <Text style={styles.taskDetailLabel}>קטגוריה:</Text>
            <Text style={styles.taskDetailValue}>{task.category}</Text>
          </View>

          <View style={styles.taskDetailSection}>
            <Text style={styles.taskDetailLabel}>תאריך יצירה:</Text>
            <Text style={styles.taskDetailValue}>{task.createdDate}</Text>
          </View>

          {task.assignedTo && (
            <View style={styles.taskDetailSection}>
              <Text style={styles.taskDetailLabel}>מוקצה ל:</Text>
              <Text style={styles.taskDetailValue}>{task.assignedTo}</Text>
            </View>
          )}

          <View style={styles.taskDetailSection}>
            <Text style={styles.taskDetailLabel}>תיאור:</Text>
            <Text style={styles.taskDetailDescription}>{task.description}</Text>
          </View>

          {task.status !== 'סגור' && (
            <View style={styles.taskActions}>
              <Pressable onPress={handleOpenCloseModal} style={styles.closeTaskButton}>
                <Text style={styles.closeTaskButtonText}>סגור משימה</Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showCloseModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCloseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>סגירת משימה</Text>
            <Text style={styles.modalSubtitle}>
              על מנת לסגור את המשימה, יש להעלות תמונה
            </Text>

            <View style={styles.field}>
              <Text style={styles.label}>תמונה *</Text>
              {closeModalImageUri ? (
                <View style={styles.closeModalImageContainer}>
                  <View style={styles.taskImagePlaceholder}>
                    <Text style={styles.taskImagePlaceholderText}>📷 תמונה נבחרה</Text>
                  </View>
                  <Pressable
                    onPress={handleCloseModalImageSelect}
                    style={styles.changeImageButton}
                  >
                    <Text style={styles.changeImageButtonText}>החלף תמונה</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={handleCloseModalImageSelect}
                  style={styles.uploadImageButton}
                >
                  <Text style={styles.uploadImageButtonText}>+ העלה תמונה</Text>
                </Pressable>
              )}
            </View>

            <View style={styles.modalButtons}>
              <Pressable
                onPress={handleConfirmClose}
                style={[styles.modalButton, styles.modalButtonPrimary]}
              >
                <Text style={styles.modalButtonText}>אישור וסגירה</Text>
              </Pressable>
              <Pressable
                onPress={() => setShowCloseModal(false)}
                style={[styles.modalButton, styles.modalButtonGhost]}
              >
                <Text style={styles.modalButtonGhostText}>ביטול</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function NewMaintenanceTaskScreen({
  unit,
  onSave,
  onCancel,
  safeAreaInsets,
  statusBar,
  userName,
}: NewMaintenanceTaskScreenProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('תיקון');
  const [priority, setPriority] = useState<MaintenancePriority>('בינוני');

  const categories = ['תיקון', 'מזגן', 'צבע', 'תחזוקה שוטפת', 'אחר'];
  const priorities: MaintenancePriority[] = ['נמוך', 'בינוני', 'גבוה', 'דחוף'];

  const handleSave = () => {
    if (!title || !description) {
      Alert.alert('שגיאה', 'אנא מלאו את כל השדות הנדרשים');
      return;
    }

    const newTask: MaintenanceTask = {
      id: `task-${Date.now()}`,
      unitId: unit.id,
      title,
      description,
      status: 'פתוח',
      priority,
      createdDate: new Date().toISOString().split('T')[0],
      category,
      assignedTo: userName,
    };

    onSave(newTask);
  };

  return (
    <SafeAreaView
      style={[styles.container, { paddingTop: safeAreaInsets.top }]}
    >
      {statusBar}
      <View style={styles.ordersHeader}>
        <Pressable onPress={onCancel} style={styles.backButton}>
          <Text style={styles.backButtonText}>← חזרה</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.warehouseHeader}>
          <View>
            <Text style={styles.title}>משימה חדשה</Text>
            <Text style={styles.subtitle}>
              הוספת משימת תחזוקה ל{unit.name}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.label}>כותרת המשימה *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="הזינו כותרת"
              textAlign="right"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>תיאור *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="הזינו תיאור מפורט"
              textAlign="right"
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>קטגוריה</Text>
            <Pressable
              onPress={() => {
                const currentIndex = categories.indexOf(category);
                const nextIndex = (currentIndex + 1) % categories.length;
                setCategory(categories[nextIndex]);
              }}
              style={styles.select}
            >
              <Text style={styles.selectValue}>{category}</Text>
              <Text style={styles.selectCaret}>▾</Text>
            </Pressable>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>עדיפות</Text>
            <Pressable
              onPress={() => {
                const currentIndex = priorities.indexOf(priority);
                const nextIndex = (currentIndex + 1) % priorities.length;
                setPriority(priorities[nextIndex]);
              }}
              style={styles.select}
            >
              <Text style={styles.selectValue}>{priority}</Text>
              <Text style={styles.selectCaret}>▾</Text>
            </Pressable>
          </View>

          <View style={styles.editActions}>
            <Pressable onPress={handleSave} style={styles.saveOrderButton}>
              <Text style={styles.saveOrderButtonText}>צור משימה</Text>
            </Pressable>
            <Pressable onPress={onCancel} style={styles.cancelOrderButton}>
              <Text style={styles.cancelOrderButtonText}>ביטול</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function OptionCard({
  title,
  icon,
  accent,
  details,
  cta,
  onPress,
}: OptionCardProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.optionCard,
        { borderColor: accent + '55', backgroundColor: 'rgba(255,255,255,0.9)' },
        pressed && { transform: [{ translateY: 1 }], opacity: 0.96 },
      ]}
    >
      <View style={[styles.optionIconWrap, { backgroundColor: accent + '22' }]}>
        <Text style={styles.optionIcon}>{icon}</Text>
      </View>
      <Text style={styles.optionTitle}>{title}</Text>
      <View style={styles.optionBullets}>
        {details.map(line => (
          <Text key={line} style={styles.optionBullet}>
            • {line}
          </Text>
        ))}
      </View>
      {cta ? (
        <View style={[styles.optionCta, { backgroundColor: accent + '22' }]}>
          <Text style={[styles.optionCtaText, { color: accent }]}>{cta}</Text>
        </View>
      ) : (
        <View style={styles.optionStatus}>
          <Text style={styles.optionStatusText}>בקרוב</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f7fb',
  },
  fullBleed: {
    flex: 1,
    backgroundColor: '#0b1224',
  },
  hubContainer: {
    flex: 1,
    backgroundColor: '#f3f6fb',
  },
  hubScroll: {
    padding: 18,
    paddingBottom: 50,
  },
  hubTopRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bg: {
    flex: 1,
  },
  bgImage: {
    resizeMode: 'cover',
  },
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6, 12, 24, 0.45)',
  },
  scroll: {
    padding: 18,
    paddingBottom: 40,
  },
  heroScroll: {
    paddingHorizontal: 20,
    paddingBottom: 46,
    paddingTop: 12,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 2,
  },
  brandBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    gap: 8,
  },
  brandDot: {
    width: 10,
    height: 10,
    borderRadius: 8,
    backgroundColor: '#38bdf8',
  },
  brandText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  userChip: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  userChipText: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 13,
  },
  topChip: {
    backgroundColor: 'rgba(56, 189, 248, 0.18)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  topChipText: {
    color: '#e0f2fe',
    fontWeight: '700',
    fontSize: 13,
  },
  heroCopy: {
    gap: 6,
    marginTop: 14,
  },
  kicker: {
    color: '#bae6fd',
    fontSize: 14,
    textAlign: 'right',
    letterSpacing: 0.3,
  },
  heroHeading: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'right',
    lineHeight: 34,
  },
  hubHeading: {
    color: '#0f172a',
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'right',
    lineHeight: 32,
  },
  hubBody: {
    color: '#1f2937',
    fontSize: 14.5,
    lineHeight: 22,
    textAlign: 'right',
    marginTop: 6,
  },
  heroBody: {
    color: '#e2e8f0',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'right',
  },
  glassRow: {
    flexDirection: 'row-reverse',
    gap: 12,
    marginTop: 16,
  },
  hubHero: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    gap: 6,
  },
  glassCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.24)',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  glassTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
  },
  glassValue: {
    color: '#38bdf8',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'right',
    marginTop: 6,
  },
  glassSmall: {
    color: '#e2e8f0',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  ctaCard: {
    backgroundColor: 'rgba(8, 13, 28, 0.8)',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    marginTop: 18,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  ctaTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'right',
  },
  ctaText: {
    color: '#cbd5e1',
    fontSize: 14,
    textAlign: 'right',
    lineHeight: 21,
  },
  ctaButtons: {
    flexDirection: 'row-reverse',
    gap: 10,
    marginTop: 6,
  },
  ctaPrimary: {
    flex: 1,
  },
  ctaOutline: {
    flex: 1,
    borderColor: 'rgba(255,255,255,0.65)',
  },
  optionGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 18,
  },
  optionCard: {
    width: '48%',
    minWidth: 160,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  optionIconWrap: {
    alignSelf: 'flex-start',
    padding: 10,
    borderRadius: 12,
  },
  optionIcon: {
    fontSize: 22,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'right',
  },
  optionBullets: {
    gap: 4,
    marginTop: 2,
  },
  optionBullet: {
    fontSize: 13.5,
    color: '#475569',
    textAlign: 'right',
    lineHeight: 19,
  },
  optionCta: {
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  optionCtaText: {
    fontWeight: '800',
    fontSize: 14,
  },
  optionStatus: {
    marginTop: 8,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  optionStatusText: {
    color: '#64748b',
    fontWeight: '700',
    fontSize: 13,
  },
  ordersHeader: {
    flexDirection: 'row-reverse',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  backButtonText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row-reverse',
    gap: 10,
    marginTop: 20,
  },
  statCard: {
    width: '32%',
    minWidth: 100,
    borderRadius: 14,
    padding: 12,
    borderWidth: 2,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#475569',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '600',
  },
  progressSection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'right',
    marginBottom: 12,
  },
  progressCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  progressInfo: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  progressPercent: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2563eb',
  },
  progressBarLarge: {
    height: 12,
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFillLarge: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 8,
  },
  progressNote: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'right',
  },
  quickActions: {
    marginTop: 24,
  },
  quickActionsRow: {
    flexDirection: 'row-reverse',
    gap: 12,
  },
  quickActionBtn: {
    flex: 1,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  quickActionIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  quickActionText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  tagRow: {
    flexDirection: 'row-reverse',
    gap: 10,
    marginTop: 16,
  },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  tagText: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '600',
  },
  heroHeader: {
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'right',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 4,
    textAlign: 'right',
    color: '#334155',
  },
  heroCard: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 20,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'right',
    color: '#fff',
  },
  heroText: {
    fontSize: 15,
    marginTop: 10,
    textAlign: 'right',
    color: '#e2e8f0',
    lineHeight: 22,
  },
  heroButtons: {
    flexDirection: 'row-reverse',
    gap: 10,
    marginTop: 18,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#22d3ee',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 10,
  },
  badgeText: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 12,
  },
  field: {
    marginTop: 14,
  },
  label: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 6,
    textAlign: 'right',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    color: '#0f172a',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  select: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectValue: {
    color: '#0f172a',
    fontSize: 14,
  },
  selectCaret: {
    color: '#64748b',
    fontSize: 16,
  },
  selectList: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  selectItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  selectItemActive: {
    backgroundColor: '#e0f2fe',
  },
  selectItemText: {
    fontSize: 14,
    color: '#0f172a',
    textAlign: 'right',
  },
  selectItemTextActive: {
    fontWeight: '700',
    color: '#0f172a',
  },
  error: {
    color: '#b91c1c',
    marginTop: 8,
    textAlign: 'right',
  },
  primaryButton: {
    marginTop: 18,
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  outlineButton: {
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  outlineButtonText: {
    color: '#2563eb',
    fontWeight: '700',
    fontSize: 15,
  },
  summaryCard: {
    backgroundColor: '#e0f2fe',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
    color: '#0f172a',
  },
  summaryText: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'right',
    color: '#0f172a',
  },
  summaryNote: {
    fontSize: 12,
    marginTop: 6,
    textAlign: 'right',
    color: '#0f172a',
  },
  // Enhanced Summary Card Styles
  summaryCardEnhanced: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginTop: 20,
    borderWidth: 2,
    borderColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    marginBottom: 8,
  },
  summaryCardHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  summaryTitleEnhanced: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'right',
    color: '#0f172a',
  },
  summaryStatsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
  },
  summaryStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryStatValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  summaryStatLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  summaryStatDivider: {
    width: 1,
    height: 50,
    backgroundColor: '#e2e8f0',
  },
  summaryNoteContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  summaryNoteEnhanced: {
    fontSize: 12,
    textAlign: 'right',
    color: '#64748b',
    fontStyle: 'italic',
  },
  // Orders Page Header
  ordersPageHeader: {
    marginBottom: 8,
  },
  ordersPageTitle: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'right',
    color: '#0f172a',
    marginBottom: 6,
  },
  ordersPageSubtitle: {
    fontSize: 16,
    textAlign: 'right',
    color: '#64748b',
    marginBottom: 4,
  },
  // Enhanced Order Card Styles
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  orderCard: {
    borderColor: '#dbeafe',
    backgroundColor: '#f8fbff',
  },
  orderCardEnhanced: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginTop: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    marginBottom: 4,
  },
  orderCardHeaderEnhanced: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#f1f5f9',
  },
  orderCardHeaderLeft: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  unitIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  unitIcon: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3b82f6',
  },
  orderCardTitleContainer: {
    flex: 1,
  },
  orderCardUnitTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'right',
    color: '#0f172a',
    marginBottom: 4,
  },
  orderCardId: {
    fontSize: 13,
    textAlign: 'right',
    color: '#64748b',
    fontWeight: '600',
  },
  statusBadgeEnhanced: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 2,
  },
  statusBadgeTextEnhanced: {
    fontSize: 14,
    fontWeight: '800',
  },
  orderInfoSection: {
    gap: 16,
  },
  orderInfoRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  orderInfoIcon: {
    width: 60,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 8,
  },
  orderInfoIconText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textAlign: 'center',
  },
  orderInfoContent: {
    flex: 1,
  },
  orderInfoLabel: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'right',
    marginBottom: 4,
    fontWeight: '600',
  },
  orderInfoValue: {
    fontSize: 15,
    color: '#0f172a',
    textAlign: 'right',
    fontWeight: '700',
  },
  orderPaymentSection: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  orderPaymentRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    gap: 12,
  },
  orderPaymentItem: {
    flex: 1,
    alignItems: 'center',
  },
  orderPaymentLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 6,
    fontWeight: '600',
  },
  orderPaymentTotal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  orderPaymentPaid: {
    fontSize: 18,
    fontWeight: '800',
    color: '#10b981',
  },
  orderPaymentRemaining: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f59e0b',
  },
  orderSpecialSection: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  orderSpecialContent: {
    flex: 1,
  },
  orderSpecialLabel: {
    fontSize: 12,
    color: '#92400e',
    textAlign: 'right',
    marginBottom: 4,
    fontWeight: '700',
  },
  orderSpecialText: {
    fontSize: 14,
    color: '#78350f',
    textAlign: 'right',
    fontWeight: '600',
  },
  orderNotesSection: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  orderNotesContent: {
    flex: 1,
  },
  orderNotesLabel: {
    fontSize: 12,
    color: '#0c4a6e',
    textAlign: 'right',
    marginBottom: 4,
    fontWeight: '700',
  },
  orderNotesText: {
    fontSize: 14,
    color: '#075985',
    textAlign: 'right',
    fontWeight: '600',
  },
  progressWrapEnhanced: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 2,
    borderTopColor: '#f1f5f9',
  },
  progressHeaderEnhanced: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressLabelEnhanced: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
  },
  progressValueEnhanced: {
    color: '#2563eb',
    fontSize: 18,
    fontWeight: '800',
  },
  progressBarEnhanced: {
    height: 12,
    backgroundColor: '#e2e8f0',
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFillEnhanced: {
    height: '100%',
    borderRadius: 999,
  },
  progressFooter: {
    alignItems: 'center',
  },
  progressFooterText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  editActionsEnhanced: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  editButtonEnhanced: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#2563eb',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  editButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  emptyOrdersState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyOrdersText: {
    fontSize: 18,
    color: '#64748b',
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'right',
    color: '#0f172a',
  },
  cardLine: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'right',
    color: '#334155',
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 10,
  },
  fieldHalf: {
    flex: 1,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  inspectionsHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 12,
  },
  statsBadge: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  statsBadgeText: {
    color: '#0ea5e9',
    fontWeight: '700',
    fontSize: 14,
  },
  missionsList: {
    gap: 12,
  },
  inspectionCard: {
    borderColor: '#e0f2fe',
    backgroundColor: '#f0f9ff',
    marginTop: 12,
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  inspectionHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  expandIcon: {
    fontSize: 16,
    color: '#64748b',
    marginLeft: 8,
  },
  inspectionDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 12,
  },
  statusRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  statusDisplayBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusDisplayText: {
    fontSize: 13,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  tasksList: {
    marginTop: 12,
    gap: 8,
  },
  tasksTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'right',
    marginBottom: 8,
  },
  taskItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  taskCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskCheckboxCompleted: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  taskCheckmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  taskText: {
    fontSize: 14,
    color: '#334155',
    textAlign: 'right',
    flex: 1,
  },
  taskTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#94a3b8',
  },
  warehouseHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 12,
  },
  alertBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  alertBadgeText: {
    color: '#dc2626',
    fontWeight: '700',
    fontSize: 12,
  },
  unitSelector: {
    marginBottom: 20,
  },
  unitScroll: {
    marginTop: 8,
  },
  unitChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginLeft: 8,
  },
  unitChipActive: {
    backgroundColor: '#a78bfa',
    borderColor: '#8b5cf6',
  },
  unitChipText: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 14,
  },
  unitChipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row-reverse',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  tabText: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: 14,
  },
  tabTextActive: {
    color: '#0f172a',
    fontWeight: '700',
  },
  categoryFilter: {
    marginBottom: 16,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginLeft: 8,
  },
  categoryChipActive: {
    backgroundColor: '#ede9fe',
    borderColor: '#a78bfa',
  },
  categoryChipText: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 13,
  },
  categoryChipTextActive: {
    color: '#7c3aed',
    fontWeight: '700',
  },
  itemsGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 12,
  },
  inventoryCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  inventoryCardLowStock: {
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  inventoryCardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  inventoryItemName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'right',
    flex: 1,
  },
  lowStockBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
  },
  lowStockBadgeText: {
    color: '#dc2626',
    fontSize: 10,
    fontWeight: '700',
  },
  inventoryCategory: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'right',
    marginBottom: 10,
  },
  stockInfo: {
    gap: 6,
    marginBottom: 12,
  },
  stockRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stockLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  stockValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  stockValueLow: {
    color: '#dc2626',
  },
  orderButton: {
    backgroundColor: '#a78bfa',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  orderButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  ordersList: {
    gap: 12,
  },
  ordersHeaderRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addOrderButton: {
    backgroundColor: '#a78bfa',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addOrderButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  orderCardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  orderItemName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'right',
    marginBottom: 6,
  },
  orderDetails: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'right',
    marginTop: 4,
  },
  orderStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  orderStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  orderTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ede9fe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  orderTypeText: {
    color: '#7c3aed',
    fontSize: 12,
    fontWeight: '600',
  },
  itemsTableSection: {
    marginBottom: 24,
  },
  itemsTable: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    marginTop: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  tableHeader: {
    flexDirection: 'row-reverse',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 2,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  tableHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'right',
  },
  tableRow: {
    flexDirection: 'row-reverse',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  tableCell: {
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  tableCellText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    textAlign: 'right',
  },
  tableCellSubtext: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'right',
    marginTop: 4,
  },
  quantityInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    minWidth: 60,
  },
  tableOrderButton: {
    backgroundColor: '#a78bfa',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  tableOrderButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  orderHeaderRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  orderDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 16,
  },
  selectedItemsSummary: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  selectedItemsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'right',
    marginBottom: 8,
  },
  selectedItemText: {
    fontSize: 14,
    color: '#334155',
    textAlign: 'right',
    marginTop: 4,
  },
  orderActions: {
    flexDirection: 'row-reverse',
    gap: 12,
    marginTop: 16,
  },
  saveOrderButton: {
    flex: 1,
    backgroundColor: '#a78bfa',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveOrderButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  cancelOrderButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cancelOrderButtonText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 15,
  },
  currentQuantityText: {
    fontSize: 12,
    color: '#a78bfa',
    fontWeight: '600',
    textAlign: 'right',
    marginTop: 4,
  },
  selectedItemRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  removeItemButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  removeItemButtonText: {
    color: '#dc2626',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 20,
  },
  orderDetailsSection: {
    marginTop: 24,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  unitsGrid: {
    gap: 16,
    marginTop: 16,
  },
  unitCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  unitCardHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 16,
  },
  unitIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  unitIconText: {
    fontSize: 28,
  },
  unitCardName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'right',
  },
  unitCardType: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'right',
    marginTop: 4,
  },
  unitStats: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  unitStatItem: {
    alignItems: 'center',
  },
  unitStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  unitStatLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  taskCardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  taskCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'right',
    marginBottom: 8,
  },
  taskCardDescription: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'right',
    marginBottom: 8,
  },
  taskCardMeta: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginBottom: 8,
  },
  taskCardMetaText: {
    fontSize: 12,
    color: '#64748b',
  },
  taskCardAssigned: {
    fontSize: 12,
    color: '#3b82f6',
    textAlign: 'right',
  },
  taskCardBadges: {
    alignItems: 'flex-end',
    gap: 8,
  },
  taskStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  taskStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  taskPriorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  taskPriorityText: {
    fontSize: 12,
    fontWeight: '700',
  },
  taskImageIndicator: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  taskImageIndicatorText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'right',
  },
  taskDetailCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  taskDetailHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#f1f5f9',
  },
  taskDetailTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'right',
    flex: 1,
  },
  taskDetailBadges: {
    alignItems: 'flex-end',
    gap: 8,
    marginRight: 12,
  },
  taskDetailSection: {
    marginBottom: 20,
  },
  taskDetailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'right',
    marginBottom: 6,
  },
  taskDetailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    textAlign: 'right',
  },
  taskDetailDescription: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'right',
    lineHeight: 22,
  },
  taskImageContainer: {
    marginTop: 8,
  },
  taskImagePlaceholder: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  taskImagePlaceholderText: {
    fontSize: 16,
    color: '#64748b',
  },
  changeImageButton: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  changeImageButtonText: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 14,
  },
  uploadImageButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  uploadImageButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  taskActions: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  closeTaskButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeTaskButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  closeModalImageContainer: {
    marginTop: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'right',
    marginTop: 8,
    marginBottom: 20,
  },
  progressWrap: {
    marginTop: 16,
    gap: 6,
  },
  progressHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
  },
  progressLabel: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '700',
  },
  progressValue: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '700',
  },
  progressBar: {
    height: 10,
    backgroundColor: '#e2e8f0',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563eb',
  },
  editActions: {
    marginTop: 16,
    gap: 10,
  },
  addPaymentRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  addPaymentTrigger: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#0ea5e9',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
  },
  addPaymentText: {
    color: '#fff',
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    gap: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'right',
    color: '#0f172a',
  },
  modalButtons: {
    flexDirection: 'row-reverse',
    gap: 10,
    marginTop: 4,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: '800',
  },
  modalButtonGhost: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
  },
  modalButtonGhostText: {
    color: '#0f172a',
    fontWeight: '800',
  },
});

export default App;
