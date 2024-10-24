import { SerializedGraphStatus } from "../../inspector/serialized-graph";
import { Edge } from "./edge";
import { Entrypoint } from "./entrypoint";
import { Extras } from "./extras";
import { Node } from "./node";
import { SerializedGraphMetadata } from "./serialized-graph-metadata";

export interface SerializedGraphJson {
    nodes: Record<string, Node>;
    edges: Record<string, Edge>;
    entrypoints: Record<string, Entrypoint<unknown>[]>;
    extras: Extras;
    status?: SerializedGraphStatus;
    metadata?: SerializedGraphMetadata;
  }