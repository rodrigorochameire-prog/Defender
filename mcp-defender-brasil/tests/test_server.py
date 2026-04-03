import pytest
from fastmcp import Client
from server import mcp


@pytest.mark.asyncio
async def test_server_has_two_tools():
    async with Client(mcp) as client:
        tools = await client.list_tools()
    tool_names = [t.name for t in tools]
    assert "consultar_datajud" in tool_names
    assert "dados_localidade" in tool_names
    assert len(tool_names) == 2
