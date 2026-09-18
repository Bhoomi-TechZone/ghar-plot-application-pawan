// /**
//  * Beautiful Admin Notification Popup
//  * Specifically for Admin Reminders & Alerts
//  */
// import React from 'react';
// import {
//   Modal,
//   View,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   Dimensions,
//   ScrollView,
// } from 'react-native';

// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

// //const { width } = Dimensions.get('window');
// const { width, height } = Dimensions.get('window');

// const AdminNotificationPopup = ({
//   visible,
//   onClose,
//   employeeName = 'Admin',
//   title = 'Admin Notification',
//   clientName = '',
//   reason = '',
//   note = '',
//   scheduledAt = '',
//   nextScheduledAt = '',
//   createdAt = '', // 🔥 Add createdAt prop
//   time = '', // 🔥 Add time prop for scheduled time display
//   date = '', // 🔥 Add date prop for fallback
//   type = 'admin_reminder',
//   onEdit,
// }) => {
//   // Always use Indigo theme for Admin
//   const primaryColor = '#4F46E5';
//   const secondaryColor = '#64748b';
//   const bgColor = '#EEF2FF';
//   const iconName = 'notifications-active';
  
//   const isAlert = String(type).toLowerCase().includes('alert') || String(title).toLowerCase().includes('alert');
//   const headerTitle = isAlert ? 'Admin Alert' : 'Admin Reminder';
//   const actionText = isAlert ? 'admin created an alert' : 'admin created a reminder';

//   // Format ISO date to readable string in IST
//   const formatDateTime = (isoStr) => {
//     if (!isoStr) return null;
//     try {
//       const d = new Date(isoStr);
//       if (isNaN(d.getTime())) return null;
//       return d.toLocaleString('en-IN', {
//         timeZone: 'Asia/Kolkata',
//         day: '2-digit',
//         month: '2-digit',
//         year: 'numeric',
//         hour: '2-digit',
//         minute: '2-digit',
//         hour12: false,
//       }).replace(',', ' •');
//     } catch (_) { return null; }
//   };


  
//   // Format time only (HH:mm) in IST
//   const formatTime = (timeStr) => {
//     if (!timeStr) return null;
//     // If it's already in HH:mm format, return it
//     if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
//       return timeStr;
//     }
//     // Otherwise try to parse as ISO string and convert to IST time
//     try {
//       const d = new Date(timeStr);
//       if (isNaN(d.getTime())) return null;
//       return d.toLocaleTimeString('en-IN', {
//         timeZone: 'Asia/Kolkata',
//         hour: '2-digit',
//         minute: '2-digit',
//         hour12: false,
//       });
//     } catch (_) { return null; }
//   };

//   const formattedScheduled = formatDateTime(scheduledAt);
//   const formattedNext = formatDateTime(nextScheduledAt);
//   const formattedCreated = formatDateTime(createdAt); // 🔥 Format created date
  
//   // 🔥 Get scheduled time - try scheduledAt, then time prop, then date+time combo
//   const scheduledTimeDisplay = time 
//     ? (typeof time === 'object' 
//         ? `${String(time.hour || 0).padStart(2, '0')}:${String(time.minute || 0).padStart(2, '0')}`
//         : formatTime(time))
//     : (scheduledAt ? formatTime(scheduledAt) : null);

//   return (
//     <Modal
//       visible={visible}
//       transparent
//       animationType="fade"
//       onRequestClose={onClose}
//     >
//       <View style={styles.overlay}>
//         <View style={styles.container}>
//           {/* Header */}
//           <View style={[styles.header, { backgroundColor: primaryColor }]}>
//             <View style={styles.headerIcon}>
//               <MaterialIcons name={iconName} size={28} color="#fff" />
//             </View>
//             <Text style={styles.headerTitle}>{headerTitle}</Text>
//           </View>
         
//           {/* Content */}
//          <ScrollView
//           style={styles.content}
//           contentContainerStyle={styles.scrollContent}
//           showsVerticalScrollIndicator={false}
//         >
//           {/* YAHAN APNA POORA EXISTING CONTENT SAME RAKHO */}
//           {/* Content */}      
//             {/* Admin Badge */}
//             <View style={styles.employeeBadge}>
//               <View style={[styles.avatar, { backgroundColor: primaryColor + '20' }]}>
//                 <MaterialIcons name="security" size={24} color={primaryColor} />
//               </View>
//               <View style={styles.employeeInfo}>
//                 <Text style={styles.employeeName}>{employeeName === 'Employee' ? 'Admin' : employeeName}</Text>
//                 <Text style={styles.employeeAction}>{actionText}</Text>
//               </View>
//             </View>

//             {/* Details Card */}
//             <View style={[styles.detailsCard, { backgroundColor: bgColor }]}>
//               {/* Reminder Title */}
//               <View style={styles.detailRow}>
//                 <MaterialIcons name="event-note" size={20} color={primaryColor} />
//                 <View style={styles.detailContent}>
//                   <Text style={styles.detailLabel}>Reminder</Text>
//                   <Text style={styles.detailValue}>{title || 'N/A'}</Text>
//                 </View>
//               </View>

//               {/* Client Name */}
//               {clientName ? (
//                 <View style={styles.detailRow}>
//                   <MaterialIcons name="person-outline" size={20} color={primaryColor} />
//                   <View style={styles.detailContent}>
//                     <Text style={styles.detailLabel}>Client</Text>
//                     <Text style={styles.detailValue}>{clientName}</Text>
//                   </View>
//                 </View>
//               ) : null}

//              {/* Message / Reason / Note / Scheduled Time / Created At */}
//               {(note || reason || scheduledTimeDisplay || formattedCreated) ? (
//                 <View style={[styles.detailRow, styles.noteRow]}>
//                   <MaterialIcons name="notes" size={20} color={primaryColor} />
//                   <View style={styles.detailContent}>
//                     <Text style={styles.detailLabel}>Details</Text>
//                     <Text style={styles.detailValue}>
//                       {note || reason}
//                       {scheduledTimeDisplay
//                         ? `\n⏰ Scheduled: ${scheduledTimeDisplay}`
//                         : ''}
//                       {formattedCreated
//                         ? `\n🗓️ Created On: ${formattedCreated}`
//                         : ''}
//                     </Text>
//                   </View>
//                 </View>
//               ) : null}

//               {/* Scheduled Date/Time - REMOVED (now merged into DETAILS section above) */}

//               {/* Created Date/Time - REMOVED (now merged into DETAILS section above) */}

//               {/* Next Scheduled Notification */}
//               {formattedNext ? (
//                 <View style={[styles.detailRow, styles.noteRow]}>
//                   <MaterialIcons name="update" size={20} color={primaryColor} />
//                   <View style={styles.detailContent}>
//                     <Text style={styles.detailLabel}>Next Scheduled</Text>
//                     <Text style={styles.detailValue}>⏭️ {formattedNext}</Text>
//                   </View>
//                 </View>
//               ) : null}
//             </View>
          
//         </ScrollView> 

//           {/* Action Buttons */}
//           <View style={styles.buttonRow}>
//             <TouchableOpacity
//               style={[styles.actionButton, { backgroundColor: secondaryColor }]}
//               onPress={onClose}
//               activeOpacity={0.8}
//             >
//               <Text style={styles.buttonText}>OK</Text>
//             </TouchableOpacity>

//             <TouchableOpacity
//               style={[styles.actionButton, { backgroundColor: primaryColor }]}
//               onPress={() => {
//                 onClose();
//                 if (onEdit) onEdit();
//               }}
//               activeOpacity={0.8}
//             >
//               <MaterialIcons name="edit" size={18} color="#fff" style={{ marginRight: 8 }} />
//               <Text style={styles.buttonText}>Edit</Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       </View>
//     </Modal>
//   );
// };


/**
 * Beautiful Admin Notification Popup
 * Specifically for Admin Reminders & Alerts
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';

import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const { width, height } = Dimensions.get('window');

const AdminNotificationPopup = ({
  visible,
  onClose,
  employeeName = 'Admin',
  title = 'Admin Notification',
  clientName = '',
  reason = '',
  note = '',
  scheduledAt = '',
  nextScheduledAt = '',
  createdAt = '',
  time = '',
  date = '',
  type = 'admin_reminder',
  onEdit,

  // Repeat configuration props
  nextScheduledDisplay = '',
  repeatFrequency = '',
  repeatDaily = false,
  repeatMetadata = {},           // 🔥 object or JSON string
  customRepeatMinutes = 0,       // 🔥 direct minutes field
  customIntervalMinutes = 0,     // 🔥 alternate minutes field
}) => {
  // Always use Indigo theme for Admin
  const primaryColor = '#4F46E5';
  const secondaryColor = '#64748b';
  const bgColor = '#EEF2FF';
  const iconName = 'notifications-active';

  const isAlert =
    String(type).toLowerCase().includes('alert') ||
    String(title).toLowerCase().includes('alert');

  const headerTitle = isAlert ? 'Admin Alert' : 'Admin Reminder';

  const actionText = isAlert
    ? 'admin created an alert'
    : 'admin created a reminder';

  // ============================================================
  // FORMAT ISO DATE/TIME -> IST (12-hour AM/PM)
  // Used for Created At and Next Scheduled
  // ============================================================

  const formatDateTime = (isoStr) => {
    if (!isoStr) return null;

    try {
      const d = new Date(isoStr);

      if (isNaN(d.getTime())) return null;

      const dateStr = d.toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

      const timeStr = d.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).toLowerCase();

      return `${dateStr} • ${timeStr}`;
    } catch (_) {
      return null;
    }
  };

  // ============================================================
  // FORMAT REMINDER TIME -> 12-hour AM/PM
  // Example: 16:51 -> 4:51 pm, 05:12 -> 5:12 am
  // ============================================================

  const formatTime = (timeStr) => {
    if (!timeStr) return null;

    // Already HH:mm
    if (/^\d{1,2}:\d{2}$/.test(String(timeStr))) {
      const [hours, minutes] = String(timeStr)
        .split(':')
        .map(Number);

      const period = hours >= 12 ? 'pm' : 'am';
      const hour12 = hours % 12 || 12;
      return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
    }

    // If ISO timestamp was supplied
    try {
      const d = new Date(timeStr);

      if (isNaN(d.getTime())) return null;

      return d.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).toLowerCase();
    } catch (_) {
      return null;
    }
  };

  // ============================================================
  // GET CURRENT IST DATE/TIME
  // This avoids device timezone problems.
  // ============================================================

  const getCurrentIST = () => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date());

    const result = {};

    parts.forEach((part) => {
      if (part.type !== 'literal') {
        result[part.type] = part.value;
      }
    });

    return {
      year: Number(result.year),
      month: Number(result.month),
      day: Number(result.day),
      hour: Number(result.hour),
      minute: Number(result.minute),
    };
  };

  // ============================================================
  // NEXT SCHEDULED
  //
  // IMPORTANT:
  // Do NOT use nextScheduledAt here.
  //
  // We use:
  // date = 2026-08-12
  // time = 20:55
  //
  // Daily:
  // 12/08/2026 20:55
  //        ↓ passed
  // 13/08/2026 20:55
  // ============================================================

  const getNextScheduledDisplay = () => {
    if (!date || !time) {
      return null;
    }

    try {
      // Remove time part if date is ISO
      const datePart = String(date).split('T')[0];

      const match = datePart.match(
        /^(\d{4})-(\d{2})-(\d{2})$/
      );

      if (!match) {
        console.warn(
          'Invalid reminder date:',
          date
        );
        return null;
      }

      let year = Number(match[1]);
      let month = Number(match[2]);
      let day = Number(match[3]);

      const timeString = String(time);

      const timeMatch = timeString.match(
        /^(\d{1,2}):(\d{2})$/
      );

      if (!timeMatch) {
        console.warn(
          'Invalid reminder time:',
          time
        );
        return null;
      }

      const hours = Number(timeMatch[1]);
      const minutes = Number(timeMatch[2]);

      if (
        hours < 0 ||
        hours > 23 ||
        minutes < 0 ||
        minutes > 59
      ) {
        return null;
      }

      const now = getCurrentIST();

      // ========================================================
      // Check whether reminder is DAILY
      // ========================================================

      const isDaily =
        repeatDaily === true ||
        String(repeatFrequency).toLowerCase() === 'daily';

      // ========================================================
      // Check whether reminder is CUSTOM/MINUTES repeat
      // ========================================================
      const customMins = parseInt(
        // Check all possible sources for the interval value
        (typeof repeatMetadata === 'object' && repeatMetadata !== null
          ? repeatMetadata.customIntervalMinutes || repeatMetadata.customRepeatMinutes
          : null) ||
        (typeof repeatMetadata === 'string' && repeatMetadata
          ? (() => { try { const p = JSON.parse(repeatMetadata); return p.customIntervalMinutes || p.customRepeatMinutes; } catch (_) { return null; } })()
          : null) ||
        customRepeatMinutes ||
        customIntervalMinutes ||
        0
      );
      const isCustomMinutes =
        String(repeatFrequency).toLowerCase() === 'custom' &&
        customMins > 0;

      // ========================================================
      // Compare calendar date/time without converting through
      // UTC. This prevents the 5:30 hour/date shift.
      // ========================================================

      const candidateValue =
        year * 100000000 +
        month * 1000000 +
        day * 10000 +
        hours * 100 +
        minutes;

      const nowValue =
        now.year * 100000000 +
        now.month * 1000000 +
        now.day * 10000 +
        now.hour * 100 +
        now.minute;

      // ========================================================
      // CUSTOM/MINUTES REPEAT — calculate next future occurrence
      // ========================================================
      if (isCustomMinutes) {
        // Build base Date in IST (treat date+time as IST local wall clock)
        // Use UTC constructor with IST offset correction
        const istOffsetMs = 5.5 * 60 * 60 * 1000;
        // date+time as UTC would be wrong; shift by IST offset to get correct UTC equivalent
        const baseUTC = Date.UTC(year, month - 1, day, hours, minutes, 0) - istOffsetMs;
        const intervalMs = customMins * 60 * 1000;
        const nowMs = Date.now();
        let nextMs = baseUTC;
        // Advance by intervals until we are in the future
        while (nextMs <= nowMs) {
          nextMs += intervalMs;
        }
        const nextDate = new Date(nextMs);
        // Format in IST 12-hour AM/PM
        const dateStr = nextDate.toLocaleDateString('en-IN', {
          timeZone: 'Asia/Kolkata',
          day: '2-digit', month: '2-digit', year: 'numeric',
        });
        const timeStr = nextDate.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: 'numeric', minute: '2-digit', hour12: true,
        }).toLowerCase();
        return `${dateStr} • ${timeStr}`;
      }

      // ========================================================
      // DAILY / HOURLY / WEEKLY / MONTHLY REMINDER
      // ========================================================

      const freq = String(repeatFrequency).toLowerCase();
      if (isDaily || freq === 'daily') {
        if (candidateValue <= nowValue) {
          const nextDay = new Date(Date.UTC(year, month - 1, day));
          nextDay.setUTCDate(nextDay.getUTCDate() + 1);
          year = nextDay.getUTCFullYear();
          month = nextDay.getUTCMonth() + 1;
          day = nextDay.getUTCDate();
        }
      } else if (freq === 'hourly') {
        const istOffsetMs = 5.5 * 60 * 60 * 1000;
        let nextMs = Date.UTC(year, month - 1, day, hours, minutes, 0) - istOffsetMs;
        const nowMs = Date.now();
        while (nextMs <= nowMs) {
          nextMs += 60 * 60 * 1000;
        }
        const nextDate = new Date(nextMs);
        const dateStr = nextDate.toLocaleDateString('en-IN', {
          timeZone: 'Asia/Kolkata',
          day: '2-digit', month: '2-digit', year: 'numeric',
        });
        const timeStr = nextDate.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: 'numeric', minute: '2-digit', hour12: true,
        }).toLowerCase();
        return `${dateStr} • ${timeStr}`;
      } else if (freq === 'weekly') {
        const istOffsetMs = 5.5 * 60 * 60 * 1000;
        let nextMs = Date.UTC(year, month - 1, day, hours, minutes, 0) - istOffsetMs;
        const nowMs = Date.now();
        while (nextMs <= nowMs) {
          nextMs += 7 * 24 * 60 * 60 * 1000;
        }
        const nextDate = new Date(nextMs);
        const dateStr = nextDate.toLocaleDateString('en-IN', {
          timeZone: 'Asia/Kolkata',
          day: '2-digit', month: '2-digit', year: 'numeric',
        });
        const timeStr = nextDate.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: 'numeric', minute: '2-digit', hour12: true,
        }).toLowerCase();
        return `${dateStr} • ${timeStr}`;
      } else if (freq === 'monthly') {
        const nextMonth = new Date(Date.UTC(year, month - 1, day));
        while (year * 100000000 + month * 1000000 + day * 10000 + hours * 100 + minutes <= nowValue) {
          nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
          year = nextMonth.getUTCFullYear();
          month = nextMonth.getUTCMonth() + 1;
          day = nextMonth.getUTCDate();
        }
      }

      // If one-time alert has already passed, there is NO next occurrence
      if (candidateValue <= nowValue && !isDaily && freq !== 'daily' && !isCustomMinutes && freq !== 'hourly' && freq !== 'weekly' && freq !== 'monthly') {
        return null;
      }

      // ========================================================
      // FORMAT FINAL DATE (12-hour AM/PM)
      // ========================================================

      const formattedDate =
        `${String(day).padStart(2, '0')}/` +
        `${String(month).padStart(2, '0')}/` +
        `${year}`;

      const period = hours >= 12 ? 'pm' : 'am';
      const hour12 = hours % 12 || 12;
      const formattedTime = `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;

      return `${formattedDate} • ${formattedTime}`;
    } catch (error) {
      console.warn(
        'Error calculating next scheduled:',
        error
      );

      return null;
    }
  };

  // ============================================================
  // FINAL DISPLAY VALUES
  // ============================================================

  // Scheduled time display
  const scheduledTimeDisplay =
    scheduledAt
      ? formatTime(scheduledAt)
      : time
        ? typeof time === 'object'
          ? `${String(time.hour || 0).padStart(2, '0')}:${String(time.minute || 0).padStart(2, '0')}`
          : formatTime(time)
        : null;

  // Created At formatted as IST 12-hour AM/PM
  const formattedCreated = formatDateTime(createdAt);

  // ============================================================
  // NEXT SCHEDULED:
  //
  // Priority 1: Use nextScheduledDisplay prop if passed from parent (e.g. Alerts.js card)
  // Priority 2: Use nextScheduledAt from FCM/backend if present (exact next occurrence)
  // Priority 3: Calculate from date + time + repeat info (fallback)
  // ============================================================

  let formattedNext = nextScheduledDisplay || null;

  // Priority 2: calculate from date + time + repeat settings
  if (!formattedNext) {
    formattedNext = getNextScheduledDisplay();
  }

  // Priority 3: use nextScheduledAt from FCM/backend if above couldn't calculate
  if (!formattedNext && nextScheduledAt) {
    const parsed = formatDateTime(nextScheduledAt);
    if (parsed) {
      formattedNext = parsed;
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>

          {/* Header */}
          <View
            style={[
              styles.header,
              { backgroundColor: primaryColor },
            ]}
          >
            <View style={styles.headerIcon}>
              <MaterialIcons
                name={iconName}
                size={28}
                color="#fff"
              />
            </View>

            <Text style={styles.headerTitle}>
              {headerTitle}
            </Text>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >

            {/* Admin Badge */}
            <View style={styles.employeeBadge}>
              <View
                style={[
                  styles.avatar,
                  {
                    backgroundColor:
                      primaryColor + '20',
                  },
                ]}
              >
                <MaterialIcons
                  name="security"
                  size={24}
                  color={primaryColor}
                />
              </View>

              <View style={styles.employeeInfo}>
                <Text style={styles.employeeName}>
                  {employeeName === 'Employee'
                    ? 'Admin'
                    : employeeName}
                </Text>

                <Text style={styles.employeeAction}>
                  {actionText}
                </Text>
              </View>
            </View>

            {/* Details Card */}
            <View
              style={[
                styles.detailsCard,
                { backgroundColor: bgColor },
              ]}
            >

              {/* Reminder Title */}
              <View style={styles.detailRow}>
                <MaterialIcons
                  name="event-note"
                  size={20}
                  color={primaryColor}
                />

                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>
                    Reminder
                  </Text>

                  <Text style={styles.detailValue}>
                    {title || 'N/A'}
                  </Text>
                </View>
              </View>

              {/* Client Name */}
              {clientName ? (
                <View style={styles.detailRow}>
                  <MaterialIcons
                    name="person-outline"
                    size={20}
                    color={primaryColor}
                  />

                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>
                      Client
                    </Text>

                    <Text style={styles.detailValue}>
                      {clientName}
                    </Text>
                  </View>
                </View>
              ) : null}

              {/* Details */}
              {(
                note ||
                reason ||
                scheduledTimeDisplay ||
                formattedCreated
              ) ? (
                <View
                  style={[
                    styles.detailRow,
                    styles.noteRow,
                  ]}
                >
                  <MaterialIcons
                    name="notes"
                    size={20}
                    color={primaryColor}
                  />

                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>
                      Details
                    </Text>

                    <Text style={styles.detailValue}>
                      {(() => {
                        const raw = String(note || reason || '').trim();
                        const cleaned = raw
                          .split('\n')
                          .filter(line => {
                            const l = line.trim();
                            return !l.startsWith('⏰ Scheduled:') && !l.startsWith('🔁 Next:') && !l.startsWith('⏳ In ');
                          })
                          .join('\n')
                          .trim();
                        return cleaned || 'N/A';
                      })()}

                      {scheduledTimeDisplay
                        ? `\n⏰ Scheduled: ${scheduledTimeDisplay}`
                        : ''}

                      {formattedCreated
                        ? `\n🗓️ Created On: ${formattedCreated}`
                        : ''}
                    </Text>
                  </View>
                </View>
              ) : null}

              {/* Next Scheduled Notification */}
              {formattedNext ? (
                <View
                  style={[
                    styles.detailRow,
                    styles.noteRow,
                  ]}
                >
                  <MaterialIcons
                    name="update"
                    size={20}
                    color={primaryColor}
                  />

                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>
                      Next Scheduled
                    </Text>

                    <Text style={styles.detailValue}>
                      ⏭️ {formattedNext}
                    </Text>
                  </View>
                </View>
              ) : null}

            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.buttonRow}>

            <TouchableOpacity
              style={[
                styles.actionButton,
                {
                  backgroundColor: secondaryColor,
                },
              ]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>
                OK
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                {
                  backgroundColor: primaryColor,
                },
              ]}
              onPress={() => {
                onClose();

                if (onEdit) {
                  onEdit();
                }
              }}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name="edit"
                size={18}
                color="#fff"
                style={{ marginRight: 8 }}
              />

              <Text style={styles.buttonText}>
                Edit
              </Text>
            </TouchableOpacity>

          </View>

        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
container: {
  width: width * 0.85,
  maxHeight: height * 0.80,
  backgroundColor: '#fff',
  borderRadius: 20,
  overflow: 'hidden',
  elevation: 10,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 5 },
  shadowOpacity: 0.3,
  shadowRadius: 10,
},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    gap: 12,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  content: {
    flexGrow: 0,
  },
  scrollContent: {
  padding: 20,
  paddingBottom: 10,
},
  employeeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
  },
  employeeAction: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  detailsCard: {
    padding: 16,
    borderRadius: 15,
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
    lineHeight: 20,
  },
  noteRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(79, 70, 229, 0.1)',
    paddingTop: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 0,
    gap: 12,
    backgroundColor: '#fff',
  },
  actionButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default AdminNotificationPopup;