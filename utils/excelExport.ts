import * as XLSX from 'xlsx'
import RNFS from 'react-native-fs'
import Share from 'react-native-share'
import { Alert, Platform } from 'react-native'

export async function exportToExcel(data: any[][], filename: string) {
  try {
    const ws = XLSX.utils.aoa_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    
    // Generate file content
    const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' })
    
    // Save to file system
    const filePath = `${RNFS.DocumentDirectoryPath}/${filename}`
    await RNFS.writeFile(filePath, wbout, 'base64')
    
    // Share the file
    await Share.open({
      url: Platform.OS === 'android' ? `file://${filePath}` : filePath,
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: filename,
    })
  } catch (err: any) {
    if (err.message !== 'User did not share') {
      Alert.alert('שגיאה', 'לא ניתן לייצא את הקובץ: ' + (err.message || 'שגיאה לא ידועה'))
    }
  }
}

export async function exportOrdersReport(ordersByUnit: any[], orders: any[], formatMoney: (v: number) => string) {
  const data: any[][] = [
    ['דוח הזמנות'],
    [''],
    ['יחידה', 'מספר הזמנות', 'הכנסות', 'שולם', 'יתרה פתוחה'],
  ]

  ordersByUnit.forEach(u => {
    data.push([
      u.unit,
      u.orders.length,
      u.totalRevenue,
      u.totalPaid,
      u.totalOutstanding,
    ])
  })

  data.push([''])
  data.push(['פירוט הזמנות'])
  data.push([''])
  data.push([
    'מספר הזמנה',
    'יחידה',
    'סטטוס',
    'תאריך הגעה',
    'תאריך יציאה',
    'אורח',
    'מספר אורחים',
    'סכום כולל',
    'שולם',
    'יתרה',
    'אופן תשלום',
  ])

  orders.forEach(o => {
    data.push([
      o.id,
      o.unitNumber || 'לא צוין',
      o.status,
      o.arrivalDate || '',
      o.departureDate || '',
      o.guestName || 'ללא שם',
      o.guestsCount || 0,
      o.totalAmount || 0,
      o.paidAmount || 0,
      (o.totalAmount || 0) - (o.paidAmount || 0),
      o.paymentMethod || 'לא צוין',
    ])
  })

  await exportToExcel(data, `דוח_הזמנות_${new Date().toISOString().split('T')[0]}.xlsx`)
}

export async function exportInspectionsReport(
  inspectionsByUnit: any[],
  missions: any[],
) {
  const data: any[][] = [
    ['דוח ביקורות יציאה'],
    [''],
    ['יחידה', 'סה״כ', 'טרם הגיע', 'דורש היום', 'עבר', 'הושלמה'],
  ]

  inspectionsByUnit.forEach(u => {
    data.push([
      u.unit,
      u.total,
      u.notYet,
      u.today,
      u.overdue,
      u.done,
    ])
  })

  data.push([''])
  data.push(['פירוט ביקורות'])
  data.push([''])
  data.push([
    'תאריך יציאה',
    'יחידה',
    'סטטוס',
    'משימות הושלמו',
    'סה״כ משימות',
    'אחוז השלמה',
  ])

  missions.forEach(m => {
    const totalTasks = m.tasks?.length || 0
    const doneTasks = (m.tasks || []).filter((t: any) => t.completed).length
    const completionPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

    data.push([
      m.departureDate || '',
      m.unitNumber || 'לא צוין',
      m.status || '',
      doneTasks,
      totalTasks,
      `${completionPct}%`,
    ])
  })

  await exportToExcel(data, `דוח_ביקורות_יציאה_${new Date().toISOString().split('T')[0]}.xlsx`)
}

export async function exportWarehouseReport(
  warehouseInventoryByWarehouse: any[],
  inventoryOrders: any[],
) {
  const data: any[][] = [
    ['דוח מחסן - מלאי'],
    [''],
    ['מחסן', 'מוצר', 'כמות', 'יחידה'],
  ]

  warehouseInventoryByWarehouse.forEach(w => {
    w.items.forEach((it: any) => {
      data.push([
        w.warehouseName,
        it.name,
        it.qty,
        it.unit,
      ])
    })
  })

  data.push([''])
  data.push(['דוח מחסן - הזמנות'])
  data.push([''])
  data.push([
    'מספר הזמנה',
    'סטטוס',
    'סוג הזמנה',
    'יחידה',
    'תאריך הזמנה',
    'תאריך אספקה',
    'הוזמן ע״י',
    'מוצר',
    'כמות',
    'יחידה',
  ])

  inventoryOrders.forEach(o => {
    if (o.items && o.items.length > 0) {
      o.items.forEach((item: any) => {
        data.push([
          o.id,
          o.status,
          o.orderType,
          o.unitNumber || '',
          o.orderDate || '',
          o.deliveryDate || '',
          o.orderedBy || '',
          item.itemName,
          item.quantity,
          item.unit,
        ])
      })
    } else {
      data.push([
        o.id,
        o.status,
        o.orderType,
        o.unitNumber || '',
        o.orderDate || '',
        o.deliveryDate || '',
        o.orderedBy || '',
        o.itemName || '',
        o.quantity || 0,
        o.unit || '',
      ])
    }
  })

  await exportToExcel(data, `דוח_מחסן_${new Date().toISOString().split('T')[0]}.xlsx`)
}

export async function exportMaintenanceReport(
  maintenanceTasksByUnit: any[],
  maintenanceTasks: any[],
  resolveAssignee: (id?: string | null) => string,
  normalizeMaintenanceStatus: (s: string) => string,
) {
  const data: any[][] = [
    ['דוח תחזוקה'],
    [''],
    ['יחידה', 'פתוח', 'סגור', 'סה״כ'],
  ]

  maintenanceTasksByUnit.forEach(u => {
    data.push([
      u.unitName,
      u.open,
      u.closed,
      u.total,
    ])
  })

  data.push([''])
  data.push(['פירוט משימות תחזוקה'])
  data.push([''])
  data.push([
    'מספר משימה',
    'יחידה',
    'כותרת',
    'תיאור',
    'סטטוס',
    'מוקצה ל',
    'תאריך יצירה',
  ])

  maintenanceTasks.forEach((t: any) => {
    const assigned = (t.assigned_to || t.assignedTo || '').toString()
    data.push([
      t.id || '',
      (t.unit_id || t.unitId || t.unit || 'לא צוין').toString(),
      t.title || '',
      t.description || '',
      normalizeMaintenanceStatus(t.status),
      resolveAssignee(assigned),
      t.created_date || t.createdDate || '',
    ])
  })

  await exportToExcel(data, `דוח_תחזוקה_${new Date().toISOString().split('T')[0]}.xlsx`)
}

export async function exportAttendanceReport(
  attendancePeriodsByEmployee: any[],
  attendanceLogs: any[],
  normalizeClock: (v: any) => string,
) {
  const data: any[][] = [
    ['דוח נוכחות'],
    [''],
    ['עובד', 'פעיל עכשיו', 'סה״כ שעות', 'מספר משמרות'],
  ]

  attendancePeriodsByEmployee.forEach(p => {
    data.push([
      p.employee,
      p.isActive ? 'כן' : 'לא',
      Math.round(p.totalHours * 100) / 100,
      p.sessions.length,
    ])
  })

  data.push([''])
  data.push(['פירוט משמרות'])
  data.push([''])
  data.push([
    'עובד',
    'תאריך',
    'כניסה',
    'יציאה',
    'שעות',
    'סטטוס',
  ])

  attendanceLogs.forEach((l: any) => {
    const emp = l.employee || l.emp || l.user || 'לא צוין'
    const ci = safeDate(normalizeClock(l.clock_in))
    const co = safeDate(normalizeClock(l.clock_out))
    const end = co || new Date()
    const durHrs = ci ? Math.max(0, (end.getTime() - ci.getTime()) / (1000 * 60 * 60)) : 0
    const day = ci ? `${ci.getDate()}/${ci.getMonth() + 1}/${ci.getFullYear()}` : ''
    const timeIn = ci ? `${ci.getHours().toString().padStart(2, '0')}:${ci.getMinutes().toString().padStart(2, '0')}` : ''
    const timeOut = co ? `${co.getHours().toString().padStart(2, '0')}:${co.getMinutes().toString().padStart(2, '0')}` : (normalizeClock(l.clock_out) ? '' : 'פתוח')

    data.push([
      emp,
      day,
      timeIn,
      timeOut,
      Math.round(durHrs * 100) / 100,
      co ? 'סגור' : 'פתוח',
    ])
  })

  await exportToExcel(data, `דוח_נוכחות_${new Date().toISOString().split('T')[0]}.xlsx`)
}

function safeDate(s: string) {
  const d = new Date(s)
  return Number.isFinite(d.getTime()) ? d : null
}









