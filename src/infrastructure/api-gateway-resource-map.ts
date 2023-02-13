import {aws_apigateway as apiGateway} from "aws-cdk-lib";
import {Nuly} from "../common/utils/types";

export class ApiGatewayResourceMap {
	_map: Record<string, ApiGatewayResourceMap | Nuly> = {};
	readonly _resource: apiGateway.IResource;

	constructor (resource: apiGateway.IResource) {
		this._resource = resource;
	}

	private getFromPathHelper (s: string[], i: number): apiGateway.IResource {
		const pathPart = s[i];
		if (i === s.length) return this._resource;
		const rv = (this._map[pathPart] ??= new ApiGatewayResourceMap(this._resource.addResource(pathPart)));
		return rv.getFromPathHelper(s, i + 1);
	}

	getFromPath (s: string) {
		if (s.startsWith("/")) s = s.substring(1,);
		return this.getFromPathHelper(s.length === 0 ? [] : s.split("/"), 0);
	}

	getDirect (s: string): ApiGatewayResourceMap | Nuly {
		return this._map[s];
	}

	get resource (): apiGateway.IResource {
		return this._resource;
	}
}
