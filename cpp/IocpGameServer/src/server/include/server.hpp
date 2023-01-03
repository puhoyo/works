#pragma once

#include <WinSock2.h>

namespace IocpGameServer {
	// ��� ������ ����
	class Application;


	// ��� �޽����� �����ϴ� ��Ŷ �� ����Ʈ
	static const char kWarningPacketCount = 5;
	// ������ ������ ���� ��Ŷ �� ����Ʈ
	static const char kMaximumPacketCount = 7;

	// �⺻ IO ó�� �ڵ鷯
	DWORD IOCPThreadMain(LPVOID iocp, std::shared_ptr<Application> app);

	// Ŭ���̾�Ʈ���� ��Ŷ�� ���� �� ���� ��Ŷ ī��Ʈ�� üũ�Ͽ�
	// ��Ŷ�� �ʹ� ���� ���� ��� ��� �޽����� ����
	// return value: �ִ� ��뷮�� �ʰ��� ��� true, otherwise false.
	const bool CheckTooManyPackets(std::shared_ptr<Socket> socket);

} //namespace IocpGameServer