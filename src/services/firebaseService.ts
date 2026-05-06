import { 
  collection, 
  addDoc, 
  deleteDoc,
  doc,
  query, 
  where, 
  orderBy, 
  getDocs, 
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { AnalysisResult } from './geminiService';

export interface ScanRecord extends AnalysisResult {
  id?: string;
  userId: string;
  imageUrl: string;
  createdAt: Timestamp;
}

const SCANS_COLLECTION = 'scans';

export const saveScan = async (imageUrl: string, analysis: AnalysisResult): Promise<string> => {
  if (!auth.currentUser) throw new Error("User must be authenticated to save scans");

  try {
    const docRef = await addDoc(collection(db, SCANS_COLLECTION), {
      userId: auth.currentUser.uid,
      imageUrl,
      summary_en: analysis.summary_en,
      summary_ur: analysis.summary_ur,
      rights: analysis.rights,
      action: analysis.action,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error saving scan to Firestore:", error);
    throw error;
  }
};

export const deleteScan = async (scanId: string): Promise<void> => {
  if (!auth.currentUser) throw new Error("User must be authenticated to delete scans");

  try {
    await deleteDoc(doc(db, SCANS_COLLECTION, scanId));
  } catch (error) {
    console.error("Error deleting scan from Firestore:", error);
    throw error;
  }
};

export const getUserScans = async (): Promise<ScanRecord[]> => {
  if (!auth.currentUser) return [];

  try {
    const q = query(
      collection(db, SCANS_COLLECTION),
      where("userId", "==", auth.currentUser.uid),
      orderBy("createdAt", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ScanRecord));
  } catch (error) {
    console.error("Error fetching user scans:", error);
    throw error;
  }
};
