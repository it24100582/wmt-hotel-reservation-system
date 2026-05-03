import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const VALUES = [
  {
    icon: 'EX',
    title: 'Excellence',
    text: 'We hold ourselves to the highest standards in every part of hospitality, from room quality to culinary artistry.',
  },
  {
    icon: 'GW',
    title: 'Genuine Warmth',
    text: 'We treat every guest as family. Our hospitality is heartfelt, personal, and always sincere.',
  },
  {
    icon: 'SU',
    title: 'Sustainability',
    text: 'Our commitment to the environment drives eco-friendly practices, from solar energy to low-waste operations.',
  },
  {
    icon: 'IN',
    title: 'Innovation',
    text: 'We continuously evolve by embracing technology and creative design to redefine the luxury experience.',
  },
  {
    icon: 'IG',
    title: 'Integrity',
    text: 'Transparency and honesty underpin every interaction with our guests, our staff, and our community.',
  },
  {
    icon: 'CM',
    title: 'Community',
    text: 'We actively invest in our local community through employment, culture, and charitable partnerships.',
  },
];

const TIMELINE = [
  {
    year: '2001',
    title: 'Hotel Canvas Founded',
    text: 'Opened our doors with 20 rooms and a dream to redefine coastal luxury.',
  },
  {
    year: '2007',
    title: 'First Five-Star Rating',
    text: 'Achieved our coveted 5-star accreditation from Tourism Australia.',
  },
  {
    year: '2012',
    title: 'Major Expansion',
    text: 'Expanded to 47 rooms including signature ocean suites and family villas.',
  },
  {
    year: '2018',
    title: 'Eco-Certified Resort',
    text: "Recognized as one of Australia's first fully solar-powered luxury coastal stays.",
  },
  {
    year: '2024',
    title: 'Digital Transformation',
    text: 'Launched our new digital booking experience and 24/7 concierge service.',
  },
];

const TEAM = [
  { name: 'Amal Perera', role: 'General Manager' },
  { name: 'Nethmi Silva', role: 'Director of Guest Experience' },
  { name: 'Lakshan Fernando', role: 'Head of Operations' },
];

const SUBJECTS = [
  'General inquiry',
  'Room booking help',
  'Partnership inquiry',
  'Feedback',
];

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1600&q=80';
const STORY_IMAGE =
  'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=80';

const AboutScreen = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [message, setMessage] = useState('');

  const stats = useMemo(
    () => [
      { value: '4,200+', label: 'Happy Guests' },
      { value: '47', label: 'Luxury Rooms' },
      { value: '12', label: 'Awards Won' },
    ],
    []
  );

  const sendMessage = () => {
    if (!name.trim() || !email.trim() || !message.trim()) {
      Alert.alert('Missing details', 'Please fill your name, email, and message.');
      return;
    }
    Alert.alert('Message Sent', 'Thank you. Our team will contact you shortly.');
    setName('');
    setEmail('');
    setSubject(SUBJECTS[0]);
    setMessage('');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Image source={{ uri: HERO_IMAGE }} style={styles.heroImage} resizeMode="cover" />
      <View style={styles.heroOverlay}>
        <Text style={styles.heroTitle}>About Hotel Canvas</Text>
        <Text style={styles.heroSubtitle}>A legacy of luxury, warmth, and unforgettable stays.</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTag}>OUR STORY</Text>
        <Text style={styles.sectionTitle}>A Legacy of Luxury and Warmth</Text>
        <View style={styles.storyCard}>
          <Image source={{ uri: STORY_IMAGE }} style={styles.storyImage} resizeMode="cover" />
          <View style={styles.storyTextWrap}>
            <Text style={styles.paragraph}>
              Founded in 2001, Hotel Canvas began as a vision to create a place where nature and premium hospitality
              meet. Over two decades, we have welcomed guests from around the world with personalized service.
            </Text>
            <Text style={styles.paragraph}>
              Our name, Canvas, is more than a brand. It is a philosophy where each stay becomes a memory of
              discovery, comfort, and joy.
            </Text>
            <View style={styles.statsRow}>
              {stats.map((item) => (
                <View key={item.label} style={styles.statBox}>
                  <Text style={styles.statValue}>{item.value}</Text>
                  <Text style={styles.statLabel}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What We Stand For</Text>
        <Text style={styles.sectionDesc}>Our core values guide every decision and every guest experience.</Text>
        <View style={styles.valuesGrid}>
          {VALUES.map((value) => (
            <View key={value.title} style={styles.valueCard}>
              <Text style={styles.valueIcon}>{value.icon}</Text>
              <Text style={styles.valueTitle}>{value.title}</Text>
              <Text style={styles.valueText}>{value.text}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Our Journey</Text>
        {TIMELINE.map((item) => (
          <View key={item.year} style={styles.timelineItem}>
            <Text style={styles.timelineYear}>{item.year}</Text>
            <View style={styles.timelineContent}>
              <Text style={styles.timelineTitle}>{item.title}</Text>
              <Text style={styles.timelineText}>{item.text}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Meet Our Leadership Team</Text>
        <View style={styles.teamRow}>
          {TEAM.map((member) => (
            <View key={member.name} style={styles.teamCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{member.name.charAt(0)}</Text>
              </View>
              <Text style={styles.teamName}>{member.name}</Text>
              <Text style={styles.teamRole}>{member.role}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Get In Touch</Text>
        <View style={styles.contactRow}>
          <View style={styles.contactCard}>
            <Text style={styles.contactIcon}>TEL</Text>
            <Text style={styles.contactTitle}>Call Us</Text>
            <Text style={styles.contactText}>+94 77 123 4567</Text>
          </View>
          <View style={styles.contactCard}>
            <Text style={styles.contactIcon}>MAIL</Text>
            <Text style={styles.contactTitle}>Email Us</Text>
            <Text style={styles.contactText}>info@hotelcanvas.com</Text>
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Send Us a Message</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={styles.input}
            placeholder="Your full name"
            placeholderTextColor="#98a2b3"
          />
          <TextInput
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            placeholder="your@email.com"
            placeholderTextColor="#98a2b3"
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <View style={styles.selectLike}>
            <Text style={styles.selectLabel}>Subject: {subject}</Text>
            <View style={styles.selectButtons}>
              {SUBJECTS.map((item) => (
                <TouchableOpacity
                  key={item}
                  onPress={() => setSubject(item)}
                  style={[styles.subjectBtn, subject === item && styles.subjectBtnActive]}
                >
                  <Text style={[styles.subjectBtnText, subject === item && styles.subjectBtnTextActive]}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <TextInput
            value={message}
            onChangeText={setMessage}
            style={[styles.input, styles.messageInput]}
            placeholder="How can we help you?"
            placeholderTextColor="#98a2b3"
            multiline
            textAlignVertical="top"
          />
          <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
            <Text style={styles.sendBtnText}>Send Message</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.mapCard}>
          <Text style={styles.mapTitle}>123 Ocean Drive, Darling Harbour, Sydney NSW 2000</Text>
          <TouchableOpacity
            style={styles.mapBtn}
            onPress={() =>
              Linking.openURL('https://maps.google.com/?q=123+Ocean+Drive+Darling+Harbour+Sydney+NSW+2000')
            }
          >
            <Text style={styles.mapBtnText}>Open in Google Maps</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f1eb' },
  content: { paddingBottom: 36 },
  heroImage: { width: '100%', height: 220 },
  heroOverlay: {
    marginTop: -220,
    height: 220,
    backgroundColor: 'rgba(15,26,51,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  heroTitle: { color: '#ffffff', fontSize: 34, fontWeight: '700', textAlign: 'center', fontFamily: 'serif' },
  heroSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 14, marginTop: 8, textAlign: 'center' },
  section: { paddingHorizontal: 16, marginTop: 26 },
  sectionTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 30,
    backgroundColor: '#c6a64b',
    color: '#0f1a33',
    fontWeight: '700',
    fontSize: 11,
  },
  sectionTitle: { fontSize: 30, color: '#0f1a33', fontWeight: '700', marginTop: 10, marginBottom: 8, fontFamily: 'serif' },
  sectionDesc: { color: '#667085', fontSize: 15, marginBottom: 10 },
  storyCard: {
    borderRadius: 14,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#d8d2c5',
  },
  storyImage: { width: '100%', height: 230 },
  storyTextWrap: { padding: 14 },
  paragraph: { color: '#475467', lineHeight: 22, marginBottom: 10, fontSize: 15 },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  statBox: {
    flex: 1,
    backgroundColor: '#f8f7f4',
    borderColor: '#ebe8e0',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  statValue: { color: '#c6a64b', fontSize: 18, fontWeight: '800' },
  statLabel: { color: '#667085', fontSize: 12, marginTop: 2 },
  valuesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  valueCard: {
    width: '48.5%',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d8d2c5',
    borderRadius: 12,
    padding: 12,
    minHeight: 180,
  },
  valueIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0f1a33',
    color: '#c6a64b',
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
    marginBottom: 8,
  },
  valueTitle: { color: '#0f1a33', fontWeight: '700', fontSize: 16, marginBottom: 6, fontFamily: 'serif' },
  valueText: { color: '#667085', fontSize: 13, lineHeight: 19 },
  timelineItem: { flexDirection: 'row', marginBottom: 14, alignItems: 'flex-start' },
  timelineYear: { width: 62, color: '#c6a64b', fontWeight: '800', fontSize: 18 },
  timelineContent: { flex: 1, paddingLeft: 6 },
  timelineTitle: { color: '#0f1a33', fontSize: 20, fontWeight: '700', fontFamily: 'serif' },
  timelineText: { color: '#667085', fontSize: 14, marginTop: 3, lineHeight: 20 },
  teamRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  teamCard: {
    width: '31.5%',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#d8d2c5',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#0f1a33',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#c6a64b',
  },
  avatarText: { color: '#c6a64b', fontWeight: '800', fontSize: 20 },
  teamName: { color: '#0f1a33', fontWeight: '700', fontSize: 12, marginTop: 8, textAlign: 'center' },
  teamRole: { color: '#667085', fontSize: 11, marginTop: 4, textAlign: 'center' },
  contactRow: { flexDirection: 'row', gap: 10 },
  contactCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderColor: '#d8d2c5',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  contactIcon: { fontSize: 12, fontWeight: '800', color: '#c6a64b', marginBottom: 6 },
  contactTitle: { color: '#0f1a33', fontWeight: '700', fontFamily: 'serif', fontSize: 19 },
  contactText: { color: '#667085', marginTop: 6, fontSize: 13 },
  formCard: {
    marginTop: 14,
    backgroundColor: '#ffffff',
    borderColor: '#d8d2c5',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  formTitle: { color: '#0f1a33', fontWeight: '700', fontSize: 30, fontFamily: 'serif', marginBottom: 10 },
  input: {
    backgroundColor: '#f8f7f4',
    borderWidth: 1,
    borderColor: '#d8d2c5',
    borderRadius: 8,
    color: '#0f1a33',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    fontSize: 14,
  },
  selectLike: {
    marginBottom: 10,
    borderRadius: 8,
    backgroundColor: '#f8f7f4',
    borderWidth: 1,
    borderColor: '#d8d2c5',
    padding: 10,
  },
  selectLabel: { color: '#475467', marginBottom: 8, fontSize: 13 },
  selectButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  subjectBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#c6a64b',
  },
  subjectBtnActive: { backgroundColor: '#c6a64b' },
  subjectBtnText: { color: '#0f1a33', fontSize: 11, fontWeight: '700' },
  subjectBtnTextActive: { color: '#0f1a33' },
  messageInput: { height: 110 },
  sendBtn: {
    marginTop: 4,
    backgroundColor: '#c6a64b',
    borderRadius: 8,
    alignItems: 'center',
    paddingVertical: 12,
  },
  sendBtnText: { color: '#0f1a33', fontWeight: '800', fontSize: 13, letterSpacing: 0.3 },
  mapCard: {
    marginTop: 14,
    backgroundColor: '#0f1a33',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
  },
  mapTitle: { color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: 12, fontSize: 14 },
  mapBtn: {
    borderWidth: 1,
    borderColor: '#c6a64b',
    backgroundColor: '#c6a64b',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  mapBtnText: { color: '#0f1a33', fontWeight: '700', fontSize: 12, textTransform: 'uppercase' },
});

export default AboutScreen;
