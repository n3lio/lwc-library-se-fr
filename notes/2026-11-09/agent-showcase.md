# Agent Agentforce du site (cco-fr-de) — 2026-11-09

- Org : `cco-fr-de` (Developer Edition). Bot `LWC_Library_Agent` (0XxgK000002VpMrSAK), version active : v10.
- Agent user : `lwc_library_agent@cco-fr-showcase.demo` (Einstein Agent User + AgentforceServiceAgentUser).
- Data Library `SE_FR_Library_Knowledge` (1JDgK000009Lm1FWAS, ragFeatureConfigId `ARFPC_1JDgK000009Lm1FWAS`), alimentée par `SE_FR_Library_KnowledgeBase.pdf` (à régénérer + ré-uploader quand le manifest change).
- Grounding : le rattachement Setup seul ne suffit pas. Le script déclare l'action `search_library_docs` (target `standardInvocableAction://streamKnowledgeSearch`, source `EmployeeCopilot__AnswerQuestionsWithKnowledge`) dans les subagents search_components et explain_component_usage, ET l'expose dans `reasoning.actions`.
- External Client App `LWC Library Web Agent Bridge` : scopes api/chatbot_api/sfap_api, client credentials, Run As = agent user, IP relaxée, option « JWT access tokens » cochée (sinon 404 sur l'Agent API).
- Heroku (`lwc-library-se-fr`) : SF_AGENT_CLIENT_ID, SF_AGENT_CLIENT_SECRET, SF_AGENT_LOGIN_HOST, SF_AGENT_ID. Redémarrer le dyno après changement d'app/token.
- Limite connue : les props détaillées d'un composant ne sont pas toutes dans le PDF → l'agent le dit au lieu d'inventer.
