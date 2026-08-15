from typing import Dict, Any, List
from pydantic import BaseModel, Field

class MaterialNode(BaseModel):
    """
    Central node in the Materials Ontology.
    """
    name: str
    chemical_formula: str = ""
    properties: Dict[str, Any] = Field(default_factory=dict)
    
class Edge(BaseModel):
    """
    Represents a semantic relationship in the Project Knowledge Graph.
    """
    source_id: str
    target_id: str
    predicate: str # e.g., 'CONFIRMS_PRESENCE_OF', 'CORROBORATES'
    weight: float = 1.0

class KnowledgeGraph:
    """
    In-memory representation of the Knowledge Graph for a specific Workspace/Sample.
    """
    def __init__(self, workspace_id: str):
        self.workspace_id = workspace_id
        self.nodes: Dict[str, Any] = {}
        self.edges: List[Edge] = []
        
    def add_node(self, node_id: str, data: Any):
        self.nodes[node_id] = data
        
    def add_edge(self, source: str, target: str, predicate: str):
        self.edges.append(Edge(source_id=source, target_id=target, predicate=predicate))
        
    def serialize_for_ai(self) -> str:
        """
        Serializes the graph into a semantic triplet format for the Global Correlation AI.
        """
        triplets = []
        for edge in self.edges:
            triplets.append(f"[{edge.source_id}] - {edge.predicate} -> [{edge.target_id}]")
        return "\n".join(triplets)
