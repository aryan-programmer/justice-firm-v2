import {Nuly} from "../common/utils/types";

export class Node<Key, Value> {
	public key: Key;
	public data: any;
	public left: Node<Key, Value> | Nuly;
	public right: Node<Key, Value> | Nuly;
	public next: Node<Key, Value> | Nuly = null;

	constructor (key: Key, data?: any) {
		this.key   = key;
		this.data  = data;
		this.left  = null;
		this.right = null;
	}
}
