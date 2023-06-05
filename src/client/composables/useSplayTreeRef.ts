import {customRef} from "#imports";
import {Comparator} from "../../splaytree";
import {DEFAULT_COMPARE, ReactiveSplayTree} from "../utils/ReactiveSplayTree";

export function useSplayTreeRef<Key = number, Value = any> (comparator: Comparator<Key> = DEFAULT_COMPARE) {
	return customRef((track, trigger) => {
		let value: ReactiveSplayTree<Key, Value> = new ReactiveSplayTree(trigger, comparator);
		return {
			get () {
				track();
				return value;
			},
			set (val: ReactiveSplayTree<Key, Value>) {
				value.listener = undefined;
				val.listener   = trigger;
				value          = val;
				trigger();
			}
		};
	});
}
