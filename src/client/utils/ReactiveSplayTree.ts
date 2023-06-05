import {Nuly} from "../../common/utils/types";
import {Comparator, Node, SplayTree} from "../../splaytree";

export type Key = number | any;

export function DEFAULT_COMPARE (a: Key, b: Key): number {
	return a > b ? 1 : a < b ? -1 : 0;
}

export class ReactiveSplayTree<Key = number, Value = any> extends SplayTree<Key, Value> {
	constructor (public listener?: () => void, comparator: Comparator<Key> = DEFAULT_COMPARE) {
		super(comparator);
	}

	insert (key: Key, data?: Value): Node<Key, Value> {
		const node = super.insert(key, data);
		this.listener?.();
		return node;
	}

	add (key: Key, data?: Value): Node<Key, Value> {
		const node = super.add(key, data);
		this.listener?.();
		return node;
	}

	remove (key: Key) {
		super.remove(key);
		this.listener?.();
	}

	pop (): { key: Key; data: Value } | Nuly {
		const pop = super.pop();
		this.listener?.();
		return pop;
	}

	clear (): SplayTree<Key, Value> {
		const tree = super.clear();
		this.listener?.();
		return tree;
	}

	load (keys: Key[], values?: Value[], presort?: boolean): this {
		const tree = super.load(keys, values, presort);
		this.listener?.();
		return tree;
	}

	update (key: Key, newKey: Key, newData?: Value) {
		super.update(key, newKey, newData);
		this.listener?.();
	}
}
