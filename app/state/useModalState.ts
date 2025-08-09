import { create } from 'zustand';
import { DisplayCategory, DisplaySubcategory } from '../model/Spendings';

interface ModalState {
  expandedCategory: number;
  setExpandedCategory: (id: number) => void;

  editCatModalVisibe: boolean;
  setEditCatModalVisible: (bol: boolean) => void;

  edittingCat: DisplayCategory | undefined;
  setEdditingCat: (cat: DisplayCategory | undefined) => void;

  editSubMocalVisible: boolean;
  setEditSubModalVisible: (bol: boolean) => void;

  edditingSub: DisplaySubcategory | undefined;
  setEdditingSub: (sub: DisplaySubcategory | undefined) => void;
}

const useModalState = create<ModalState>(set => ({
  expandedCategory: -1,
  setExpandedCategory: id => set(store => ({ ...store, expandedCategory: store.expandedCategory === id ? -1 : id })),

  editCatModalVisibe: false,
  setEditCatModalVisible: bol => set(store => ({ ...store, editCatModalVisibe: bol })),

  edittingCat: undefined,
  setEdditingCat: cat => set(store => ({ ...store, edittingCat: cat })),

  editSubMocalVisible: false,
  setEditSubModalVisible: bol => set(store => ({ ...store, editSubMocalVisible: bol })),

  edditingSub: undefined,
  setEdditingSub: sub => set(store => ({ ...store, edditingSub: sub })),
}));

export default useModalState;
