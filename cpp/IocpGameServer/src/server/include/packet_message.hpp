#pragma once
#include <string>

namespace IocpGameServer {

	// ������ message_buffer�� ���� ����ü.
	// ������ �ڵ鷯�� ������ ���� �ֱ⸶��
	// message_buffer���� �� ����ü�� ����
	// Ŭ���̾�Ʈ�� �����͸� �����Ѵ�.
	struct PacketMessage {
		// API �������� ���̵�
		const unsigned char kProtocol;

		// ������
		const std::string data;

		explicit PacketMessage(const unsigned char protocol, const std::string& data) : kProtocol(protocol), data(data) {}
		explicit PacketMessage(const unsigned char protocol) : kProtocol(protocol) {}
	};
} //namespace IocpGameServer