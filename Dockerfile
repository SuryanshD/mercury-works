# Hermes runtime with the Langfuse SDK baked in.
# The base nousresearch/hermes-agent image ships the observability/langfuse plugin but NOT the
# `langfuse` Python SDK, so the plugin imports it in a try/except and silently no-ops (no traces,
# no warning). Installing it into the image's venv makes observability work out of the box and
# survives container re-create + Mac restart (unlike a one-off `docker exec ... pip install`).
FROM nousresearch/hermes-agent
RUN /usr/local/bin/uv pip install --python /opt/hermes/.venv/bin/python langfuse
